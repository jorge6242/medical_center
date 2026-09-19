# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Docker/containerization tasks | docker-expert | /Users/jorgegomez/Documents/projects/centro_medico/.agents/skills/docker-expert/SKILL.md |
| Writing, reviewing, or refactoring NestJS code | nestjs-best-practices | /Users/jorgegomez/Documents/projects/centro_medico/.agents/skills/nestjs-best-practices/SKILL.md |
| Next.js App Router work | nextjs-best-practices | /Users/jorgegomez/Documents/projects/centro_medico/.agents/skills/nextjs-best-practices/SKILL.md |
| Creating a pull request | branch-pr | /Users/jorgegomez/.agents/skills/branch-pr/SKILL.md |
| PRs over 400 changed lines, chained/stacked PR planning | gentle-ai-chained-pr | /Users/jorgegomez/.agents/skills/chained-pr/SKILL.md |
| Writing docs, READMEs, RFCs, onboarding docs | cognitive-doc-design | /Users/jorgegomez/.agents/skills/cognitive-doc-design/SKILL.md |
| Drafting comments/reviews/replies | comment-writer | /Users/jorgegomez/.agents/skills/comment-writer/SKILL.md |
| Go tests or Bubbletea TUI testing | go-testing | /Users/jorgegomez/.agents/skills/go-testing/SKILL.md |
| Creating GitHub issues | issue-creation | /Users/jorgegomez/.agents/skills/issue-creation/SKILL.md |
| “judgment day”, adversarial/dual review | judgment-day | /Users/jorgegomez/.agents/skills/judgment-day/SKILL.md |
| Creating new AI agent skills | skill-creator | /Users/jorgegomez/.agents/skills/skill-creator/SKILL.md |
| Preparing commits or splitting PR work units | work-unit-commits | /Users/jorgegomez/.agents/skills/work-unit-commits/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### docker-expert
- In this project, never run TypeScript/npm/pnpm/node directly on the host; use Docker/Makefile targets.
- Prefer `docker compose -f docker-compose.dev.yml ...` and existing `make` targets over ad-hoc containers.
- Validate Compose changes with `docker compose -f docker-compose.dev.yml config`.
- Respect explicit volume mounts; runtime volumes override image `COPY` contents.
- Keep dev/prod Docker concerns separate and preserve healthcheck-driven startup ordering.

### nestjs-best-practices
- Organize by feature module; avoid circular dependencies and duplicate providers.
- Use constructor injection; never instantiate Nest providers or PrismaClient inside modules/services.
- Validate input with DTOs/pipes and return ResponseDto/plain objects, not Prisma models.
- Controllers stay thin and do not use `try/catch`; services throw built-in/custom HTTP exceptions.
- Use guards/decorators for authz and preserve tenant-scoped Prisma queries for business data.
- Use transactions for multi-write financial/clinical operations.

### nextjs-best-practices
- App Router defaults to Server Components; add `'use client'` only for interactivity/hooks.
- Keep pages thin: compose components, do not call HTTP directly from `page.tsx`.
- Server state goes through service functions + TanStack Query; Zustand is only for global client/auth UI state.
- Forms use `react-hook-form` + `zod` + `useMutation`; UI components do not wrap mutations in `try/catch`.
- Use `loading.tsx`/skeletons and explicit client-side 401 redirect behavior.

### branch-pr
- Follow issue-first workflow before PR creation when project policy requires it.
- Keep PR description focused on why, what changed, validation, and reviewer risk.
- Do not add AI attribution or `Co-Authored-By`; use conventional commit style only.

### gentle-ai-chained-pr
- If a change risks exceeding ~400 changed lines, split into reviewable chained/stacked PR slices.
- Each slice must be independently understandable, testable, and tied to a work-unit outcome.
- Prefer dependency-ready vertical slices over file-type batches.

### cognitive-doc-design
- Reduce cognitive load with progressive disclosure, clear headings, checklists, and tables.
- Prefer recognition over recall: include concrete commands, paths, and examples.
- Put the most important decision/next action near the top.

### comment-writer
- Write warm, direct, human comments; be specific about impact and next action.
- Avoid performative praise or vague criticism; explain why something matters.
- Keep review comments scoped and actionable.

### go-testing
- For Go tests, prefer table-driven tests and precise assertions.
- Keep Bubbletea TUI tests deterministic; avoid timing-dependent expectations.
- Test behavior over implementation details.

### issue-creation
- Issues need a clear problem statement, expected behavior, acceptance criteria, and risk/impact.
- Keep scope tight; avoid bundling unrelated bugs/features.

### judgment-day
- Run two independent blind reviews, synthesize findings, fix, then re-judge when requested.
- Treat CRITICAL findings as blockers; do not hand-wave conflicting judge results.

### skill-creator
- Create skills with clear triggers, concise actionable rules, and colocated supporting assets/scripts.
- Avoid broad skills; encode concrete workflows and gotchas an agent can apply.

### work-unit-commits
- Structure commits by deliverable work unit, not by file type.
- Keep tests/docs beside the code change they validate or explain.
- Each commit should build a coherent review story and remain revertable.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/jorgegomez/Documents/projects/centro_medico/AGENTS.md | Project rules: Docker-only execution, strict TDD, tenant safety, NestJS/Next.js/Prisma conventions |
| CLAUDE.md | /Users/jorgegomez/Documents/projects/centro_medico/CLAUDE.md | Extended project documentation referenced by AGENTS.md |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
