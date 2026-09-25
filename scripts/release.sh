#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_PROJECT_ID='fa8a2de4-3b58-4983-a01e-b00ef4cd243e'
readonly DEFAULT_ENVIRONMENT_ID='5d50a571-3f33-4c72-99b5-5272b91c7af9'
readonly DEFAULT_API_SERVICE_ID='26ec91d6-a9b3-4fc9-bb99-a1a1242e53cd'
readonly DEFAULT_WEB_SERVICE_ID='6b55fb00-1ccf-4933-982d-d87d990cec15'

TAG=''
SERVICES='api,web'
DRY_RUN=false

usage() {
  cat <<'EOF'
Uso:
  ./scripts/release.sh [--tag railway-YYYYMMDD-HHMMSS-SHA] [--services api,web] [--dry-run]

Opciones:
  -t, --tag       Tag inmutable que se publicará en Docker Hub. Opcional: si se omite,
                  se genera railway-YYYYMMDD-HHMMSS-SHA a partir de Git.
  -s, --services  Servicios a publicar: api, web o api,web. Por defecto: api,web.
      --dry-run   Muestra las acciones sin construir, publicar ni desplegar.
  -h, --help      Muestra esta ayuda.

Variables opcionales:
  RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID, RAILWAY_API_SERVICE_ID,
  RAILWAY_WEB_SERVICE_ID, DOCKERHUB_USER, API_HEALTH_URL, WEB_URL.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

run() {
  if "$DRY_RUN"; then
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
    return
  fi
  "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      TAG="${2:-}"
      shift 2
      ;;
    -s|--services)
      SERVICES="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Opción no reconocida: $1"
      ;;
  esac
done

case "$SERVICES" in
  api|web|api,web) ;;
  *) fail 'Usá --services api, web o api,web.' ;;
esac

readonly PROJECT_ID="${RAILWAY_PROJECT_ID:-$DEFAULT_PROJECT_ID}"
readonly ENVIRONMENT_ID="${RAILWAY_ENVIRONMENT_ID:-$DEFAULT_ENVIRONMENT_ID}"
readonly API_SERVICE_ID="${RAILWAY_API_SERVICE_ID:-$DEFAULT_API_SERVICE_ID}"
readonly WEB_SERVICE_ID="${RAILWAY_WEB_SERVICE_ID:-$DEFAULT_WEB_SERVICE_ID}"
readonly DOCKERHUB_USER="${DOCKERHUB_USER:-jorge6242}"
readonly API_HEALTH_URL="${API_HEALTH_URL:-https://centromedicoapi-production.up.railway.app/health}"
readonly WEB_URL="${WEB_URL:-https://centromedicoweb-production.up.railway.app}"

command -v docker >/dev/null || fail 'Docker no está instalado.'
command -v railway >/dev/null || fail 'Railway CLI no está instalado.'
command -v curl >/dev/null || fail 'curl no está instalado.'

if [[ -z "$TAG" ]]; then
  git_sha="$(git rev-parse --short=8 HEAD)" || fail 'No se pudo obtener el commit Git para generar el tag.'
  TAG="railway-$(date +%Y%m%d-%H%M%S)-${git_sha}"
fi

[[ "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || fail 'El tag contiene caracteres no permitidos.'

if ! "$DRY_RUN"; then
  [[ -z "$(git status --porcelain)" ]] || fail 'El árbol Git tiene cambios. Confirmá o guardá los cambios antes de un release.'
  railway whoami --json >/dev/null || fail 'No hay una sesión válida de Railway.'
fi

update_railway_image() {
  local service_id="$1"
  local image="$2"
  local mutation
  mutation='mutation UpdateImage($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) }'

  run railway api "$mutation" \
    --variables "{\"serviceId\":\"${service_id}\",\"environmentId\":\"${ENVIRONMENT_ID}\",\"input\":{\"source\":{\"image\":\"${image}\"}}}" \
    --compact
  run railway redeploy \
    --project "$PROJECT_ID" \
    --environment "$ENVIRONMENT_ID" \
    --service "$service_id" \
    --from-source \
    --yes
}

release_api() {
  local image="${DOCKERHUB_USER}/centro-medico-api:${TAG}"
  run make docker-release-api "IMAGE_TAG=${TAG}"
  update_railway_image "$API_SERVICE_ID" "$image"
  run curl --fail --silent --show-error --retry 20 --retry-delay 3 "$API_HEALTH_URL"
}

release_web() {
  local image="${DOCKERHUB_USER}/centro-medico-web:${TAG}"
  run make docker-release-web "IMAGE_TAG=${TAG}"
  update_railway_image "$WEB_SERVICE_ID" "$image"
  run curl --fail --silent --show-error --retry 20 --retry-delay 3 --output /dev/null "$WEB_URL"
}

IFS=',' read -r -a selected_services <<< "$SERVICES"
for service in "${selected_services[@]}"; do
  case "$service" in
    api) release_api ;;
    web) release_web ;;
  esac
done

if "$DRY_RUN"; then
  printf 'Simulación de release %s preparada para: %s\n' "$TAG" "$SERVICES"
  exit 0
fi

printf 'Release %s completado para: %s\n' "$TAG" "$SERVICES"
