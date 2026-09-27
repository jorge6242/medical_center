#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

prompt_required() {
  local label="$1"
  local value=""

  while [[ -z "$value" ]]; do
    read -r -p "$label: " value
    if [[ -z "$value" ]]; then
      printf 'Este valor es obligatorio.\n' >&2
    fi
  done

  printf '%s' "$value"
}

tenant_name="$(prompt_required 'Nombre de la empresa')"
tenant_slug="$(prompt_required 'Slug (ej.: clinica-san-jose)')"
admin_name="$(prompt_required 'Nombre del administrador')"
admin_email="$(prompt_required 'Email del administrador')"

if [[ ! "$tenant_slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  printf 'El slug debe usar minúsculas, números y guiones (ej.: clinica-san-jose).\n' >&2
  exit 2
fi

read -r -p 'Apellido del administrador (opcional): ' admin_last_name
read -r -p 'Cédula del administrador (opcional): ' admin_identification_number
read -r -p 'URL pública del logo (opcional): ' tenant_logo_url
read -r -p 'Tasa IGTF inicial [0]: ' initial_igtf_rate
read -r -p 'Tasa BCV inicial (opcional): ' initial_bcv_rate
read -r -p 'Vigencia del link de acceso en días [7]: ' access_link_days
read -r -s -p 'Contraseña inicial (vacío = generar una segura): ' admin_password
printf '\n'

initial_igtf_rate="${initial_igtf_rate:-0}"
access_link_days="${access_link_days:-7}"

printf '\nSe creará el tenant "%s" con slug "%s".\n' "$tenant_name" "$tenant_slug"
read -r -p '¿Continuar? [s/N]: ' confirmation
if [[ ! "$confirmation" =~ ^[sS]([iI])?$ ]]; then
  printf 'Provisioning cancelado.\n'
  exit 0
fi

cd "$project_root"

TENANT_NAME="$tenant_name" \
TENANT_SLUG="$tenant_slug" \
TENANT_LOGO_URL="$tenant_logo_url" \
ADMIN_NAME="$admin_name" \
ADMIN_LAST_NAME="$admin_last_name" \
ADMIN_IDENTIFICATION_NUMBER="$admin_identification_number" \
ADMIN_EMAIL="$admin_email" \
ADMIN_PASSWORD="$admin_password" \
INITIAL_IGTF_RATE="$initial_igtf_rate" \
INITIAL_BCV_RATE="$initial_bcv_rate" \
ACCESS_LINK_DAYS="$access_link_days" \
make tenant-provision
