# Unidad 2.4 — Panel independiente de consultas

- Contrato: `PatientConsultations({ patientId: string })`, export nombrado en `features/patients/components/patient-consultations.tsx`.
- Panel aislado listo para integrar; esta unidad NO modifica ficha, ruta, formulario, listado, hooks, servicios ni backend.
- Lee GET `/consultations?patientId=...&page=...&limit=10[&status=...]`; todos los estados por defecto. Conserva orden backend y snapshots recibidos. No solicita endpoints clínicos ni muestra importes.
- Exige `patients:read` y `consultations:read`; sin permiso no monta el hook ni solicita datos. Al cambiar paciente se desmontan filtro/página locales; la clave existente separa caché por paciente.

## TDD y comandos

Todos los comandos de runtime usan `docker compose -f docker-compose.dev.yml exec -T web`:

- RED: tests escritos primero, componente inicial solo sección vacía; `pnpm test --runInBand --runTestsByPath src/features/patients/components/patient-consultations.test.tsx` → 7 fallos de aserción de UI ausente, sin errores HTTP/importación (`/tmp/patient-consultations-red.log`).
- GREEN inicial: mismo comando → 7 pasan (`/tmp/patient-consultations-green.log`).
- REFACTOR: se fusionaron dos casos redundantes de paginación/navegación, conservando sus assertions y HTTP real; última ejecución → **6 pruebas pasan**.
- Triangulación: cuatro estados, attendedAt independiente de PAID, servicios/especialidades snapshot, links correctos, ausencia de finanzas/llamadas clínicas, paginación y filtro reiniciado, cambio de paciente, dos permisos separados, carga/vacío, error con caché y reintento real.
- `pnpm run typecheck` → PASS; `pnpm exec eslint src/features/patients/components/patient-consultations.tsx src/features/patients/components/patient-consultations.test.tsx --max-warnings 0` → PASS.
- `pnpm exec prettier --check` sobre esos mismos dos archivos → PASS. Escritura de formato limitada a ambos.

## Límites y continuidad

- Guía Next local ya leída en 2.1: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`; sin nuevas APIs de router.
- Diff: fuente 158 + tests 200 + evidencia 20 = **378 líneas nuevas**. Safety net: archivos nuevos; regresión completa e integración en ficha corresponden al cierre/coordinador.
- Engram no disponible: persistencia física. Sin builds, migraciones, dependencias, commits, despliegues ni navegador/E2E. No garantiza ausencia absoluta de regresiones.
