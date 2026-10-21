# Unidad 2.5 — Navegación del listado

- `Ver ficha` y `Abrir ficha para editar` enlazan a `/pacientes/{id}` sin parámetros que activen edición. Ambos requieren `patients:read`; la segunda acción también exige `patients:update`.
- Retirado únicamente el modal de edición anterior y sus estados/callback. Conservados modal de alta, búsqueda, paginación, desactivación y eliminación sin modificar su lógica ni ampliar permisos.
- Labels accesibles incluyen paciente; no se promete que el enlace abra un formulario directamente.

## TDD / verificación

Comandos de runtime dentro de `docker compose -f docker-compose.dev.yml exec -T web`:

- RED: `pnpm test --runInBand --runTestsByPath src/features/patients/components/patient-navigation.test.tsx` antes de cambios productivos → 2 fallos de aserción (links ausentes/lectura), 4 casos pasan, incluidos alta/desactivación/eliminación como baseline (`/tmp/patient-navigation-red.log`).
- GREEN y después de formato: mismo comando → **6/6 pasan**, sin hooks/componentes/servicios mockeados (`/tmp/patient-navigation-green.log`, `/tmp/patient-navigation-final.log`).
- Triangulación: IDs de dos filas, lectura+update/solo lectura/solo update/ninguno, alta real POST y cierre, desactivación y eliminación HTTP con ID correcto. Controles existentes confirmados antes y después.
- `pnpm run typecheck` → PASS.
- `pnpm exec eslint src/features/patients/components/patient-columns.tsx src/features/patients/components/patient-navigation.test.tsx 'src/app/(dashboard)/pacientes/page.tsx' --max-warnings 0` → PASS.
- `pnpm exec prettier --check --single-quote --print-width 100` sobre esos tres archivos → PASS; formato limitado a ellos, conservando estilo original para evitar churn.

## Límites

- Guía Next 16.2.4 leída: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`; enlaces reales, sin router nuevo.
- Diff: página 4 adiciones/24 eliminaciones + columnas 27/11 + test 116 + evidencia 19 = **201 líneas**; reserva suficiente para revisión.
- Engram no disponible; evidencia física persistida. La integración de edición/historial se verifica aparte. Sin builds, dependencias, migraciones, commits, despliegues ni E2E de navegación.
