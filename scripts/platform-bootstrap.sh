#!/usr/bin/env bash
# Crea o actualiza el administrador global de plataforma dentro del contenedor API.
# La clave se pide con lectura oculta y viaja por stdin; nunca es argumento ni se registra.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
EXIT_EXISTS=3
DEFAULT_USERNAME="exiadmin"

read -r -p "Usuario admin de plataforma [${DEFAULT_USERNAME}]: " USERNAME_INPUT
read -r -s -p "Clave: " PASSWORD
echo
read -r -s -p "Repetir clave: " PASSWORD_CONFIRM
echo

if [[ "$PASSWORD" != "$PASSWORD_CONFIRM" ]]; then
  echo "Las claves no coinciden" >&2
  exit 1
fi

USERNAME="${USERNAME_INPUT:-$DEFAULT_USERNAME}"

run_bootstrap() {
  local overwrite="$1"
  printf '%s\n%s\n%s\n' "$USERNAME" "$PASSWORD" "$overwrite" |
    docker compose -f "$COMPOSE_FILE" exec -T api pnpm run platform:bootstrap
}

set +e
run_bootstrap "n"
status=$?
set -e

if [[ $status -eq $EXIT_EXISTS ]]; then
  read -r -p "El usuario '${USERNAME}' ya existe. Cambiar clave y revocar sus sesiones? [y/N]: " CONFIRM
  if [[ "$(printf '%s' "$CONFIRM" | tr '[:upper:]' '[:lower:]')" != "y" ]]; then
    echo "Sin cambios."
    exit 0
  fi
  run_bootstrap "y"
  exit $?
fi

exit $status
