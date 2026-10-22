#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

setup_fixture() {
  local name="$1"
  CASE_DIR="$TEST_ROOT/$name"
  mkdir -p "$CASE_DIR/repo" "$CASE_DIR/bin" "$CASE_DIR/tmp"
  export CASE_DIR
  git init -q "$CASE_DIR/repo"
  cd "$CASE_DIR/repo"
  git config user.email test@example.com
  git config user.name 'Release Test'
  printf 'committed\n' > source.txt
  printf 'committed makefile\n' > Makefile
  printf 'ignored.txt\n' > .dockerignore
  git add .
  git -c core.hooksPath=/dev/null commit -qm fixture
  COMMIT="$(git rev-parse HEAD)"
  export COMMIT
  cp "$SCRIPT_DIR/release.sh" ./release.sh
  printf 'staged\n' > source.txt
  git add source.txt
  printf 'unstaged\n' > source.txt
  printf 'untracked\n' > untracked.txt
  git status --porcelain > "$CASE_DIR/status.before"
  git diff > "$CASE_DIR/diff.before"
  git diff --cached > "$CASE_DIR/staged.before"
  : > "$CASE_DIR/calls"
  cat > "$CASE_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
exit 99
EOF
  cat > "$CASE_DIR/bin/make" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == '-C' ]]
context="$2"
[[ "$context" != "$CASE_DIR/repo" ]]
[[ "$(cat "$context/source.txt")" == committed ]]
[[ "$(cat "$context/Makefile")" == 'committed makefile' ]]
[[ -f "$context/.dockerignore" ]]
[[ ! -e "$context/untracked.txt" && ! -e "$context/.git" ]]
[[ ! -e "$context/release.sh" ]]
printf '%s\n' "$context" >> "$CASE_DIR/contexts"
printf 'make %s\n' "$*" >> "$CASE_DIR/calls"
if [[ "${FAIL_AT:-}" == signal ]]; then kill -TERM "$PPID"; fi
if [[ "${FAIL_AT:-}" == make ]]; then exit 17; fi
EOF
  cat > "$CASE_DIR/bin/railway" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'railway %s\n' "$*" >> "$CASE_DIR/calls"
if [[ "${FAIL_AT:-}" == railway && "$1" == api ]]; then exit 18; fi
if [[ "${ADVANCE_HEAD:-}" == true && "$1" == whoami ]]; then
  git -c core.hooksPath=/dev/null commit -qm 'advance during authentication'
fi
EOF
  cat > "$CASE_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf 'curl %s\n' "$*" >> "$CASE_DIR/calls"
EOF
  chmod +x "$CASE_DIR/bin/"*
}

run_release() {
  local status=0
  PATH="$CASE_DIR/bin:$PATH" TMPDIR="$CASE_DIR/tmp" \
    bash ./release.sh "$@" > "$CASE_DIR/output" 2>&1 || status=$?
  if [[ "$status" != "${EXPECTED_STATUS:-0}" ]]; then
    cat "$CASE_DIR/output" >&2
    fail "Unexpected exit status: $status"
  fi
  [[ -z "$(ls -A "$CASE_DIR/tmp")" ]] || fail 'Snapshot was not cleaned up'
}

assert_worktree_unchanged() {
  git status --porcelain > "$CASE_DIR/status.after"
  git diff > "$CASE_DIR/diff.after"
  git diff --cached > "$CASE_DIR/staged.after"
  cmp "$CASE_DIR/status.before" "$CASE_DIR/status.after"
  cmp "$CASE_DIR/diff.before" "$CASE_DIR/diff.after"
  cmp "$CASE_DIR/staged.before" "$CASE_DIR/staged.after"
  [[ "$(cat untracked.txt)" == untracked ]] || fail 'Untracked file changed'
}

setup_fixture dirty
run_release
assert_worktree_unchanged
[[ "$(wc -l < "$CASE_DIR/contexts" | tr -d ' ')" == 2 ]]
[[ "$(sort -u "$CASE_DIR/contexts" | wc -l | tr -d ' ')" == 1 ]]
grep -q "IMAGE_TAG=railway-.*-${COMMIT:0:8}" "$CASE_DIR/calls"
printf 'PASS: dirty worktree excluded; both services share one committed snapshot\n'

for failure in make railway signal; do
  setup_fixture "$failure"
  case "$failure" in make) EXPECTED_STATUS=17 ;; railway) EXPECTED_STATUS=18 ;; signal) EXPECTED_STATUS=143 ;; esac
  export FAIL_AT="$failure"
  run_release --services api
  assert_worktree_unchanged
  if [[ "$failure" != railway ]]; then
    ! grep -q 'railway api' "$CASE_DIR/calls"
  fi
  unset FAIL_AT EXPECTED_STATUS
  printf 'PASS: %s failure preserves status and cleans snapshot\n' "$failure"
done

setup_fixture dry-run
run_release --dry-run
assert_worktree_unchanged
[[ ! -s "$CASE_DIR/calls" ]] || fail 'Dry-run executed an external action'
grep -q 'make -C ' "$CASE_DIR/output"
grep -q "$COMMIT" "$CASE_DIR/output"
printf 'PASS: dry-run shows snapshot commands without external actions\n'

setup_fixture archive-failure
export REAL_GIT="$(command -v git)"
cat > "$CASE_DIR/bin/git" <<'EOF'
#!/usr/bin/env bash
if [[ "$1" == archive ]]; then exit 19; fi
exec "$REAL_GIT" "$@"
EOF
chmod +x "$CASE_DIR/bin/git"
EXPECTED_STATUS=1 run_release --services api
assert_worktree_unchanged
! grep -q '^make\|railway api' "$CASE_DIR/calls"
printf 'PASS: archive failure cleans snapshot before any build or deploy\n'

setup_fixture custom-tag
run_release --tag committed-test --services web
grep -q 'docker-release-web IMAGE_TAG=committed-test' "$CASE_DIR/calls"
! grep -q 'docker-release-api' "$CASE_DIR/calls"
assert_worktree_unchanged
printf 'PASS: custom tag and service selection preserved\n'

setup_fixture pinned-head
export ADVANCE_HEAD=true
run_release --services api
unset ADVANCE_HEAD
grep -q "IMAGE_TAG=railway-.*-${COMMIT:0:8}" "$CASE_DIR/calls"
[[ "$(git rev-parse HEAD)" != "$COMMIT" ]]
printf 'PASS: snapshot stays pinned even when HEAD changes after startup\n'
