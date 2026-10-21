# Unidad 2.2 — formulario compartido

Estado: implementado y verificado focalmente; NO equivale a ficha integrada ni cierre del cambio.

## Contrato y cambios

- Precarga primer representante de la respuesta plana GET/PATCH, conserva tipo P/E al abrir el panel y código M existente; alta continúa sin código manual.
- PATCH envía tipo/número juntos. Defaults RHF solo al montar: un refetch no borra borrador. Parent debe remontar por ID/sesión al integrar 2.3.
- Vaciar email/nacimiento/sexo omite campos y conserva persistidos; aviso explícito. Teléfono vacío mantiene payload `''`.
- Guardar/Cancelar/Cumpleaños bloqueados durante PATCH; error conserva valores y permite reintento. Alta, promoción a documento y Cancelar sin HTTP caracterizados.
- Representantes: asociación por documento y vínculos aditivos, NO reemplazo/eliminación ni edición de datos globales existentes.

## STRICT TDD

| Unidad | Safety net                            | RED                                                                                                                                     | GREEN / triangulación                                                                  | Refactor                                      |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| 2.2    | 17/17 contratos+ficha antes de editar | 4 fallos de aserción/timeout, 2 PASS: representante ausente, aviso ausente, gender vacío impide alta, Cancelar habilitado durante PATCH | 7/7; menor P, promoción E, opcionales vacíos, refetch, alta, cancelar, error/reintento | Fixtures puras separadas; cambios quirúrgicos |

Comandos Docker (desde raíz; ejecución real en contenedor web existente):

- `docker compose -f docker-compose.dev.yml exec -T web pnpm run test --runInBand patient-profile.test.tsx patient-contracts` → 17 PASS.
- `docker compose -f docker-compose.dev.yml exec -T web pnpm run test --runInBand patient-form.test.tsx` → RED 4 FAIL/2 PASS; GREEN 7 PASS.
- `pnpm run typecheck` dentro web → PASS después de corregir tipo de fixture (fallo TS inicial registrado, no RED funcional).
- `pnpm exec eslint` focalizado en formulario, sección representante, test y fixture → PASS.
- Prettier check: test/fixture PASS; dos fuentes preexistentes tienen diferencias de formato global, no reformateadas.

## Límites y continuidad

- Guides instaladas leídas: `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` y `01-app/02-guides/forms.md`; RHF/TanStack/NestJS se conservan, no Server Actions.
- Sin builds, installs, DB, commits ni despliegues. Engram no disponible: evidencia física.
- No bloquear navegación global ni prometer historial integrado: tarea 2.3 pendiente. Padres conservan responsabilidad de montaje por ID y sesión.
- Semántica backend actual no convierte documento existente a tipo M; no se amplió el contrato.
- Verificador/orquestador mantiene tasks/progress/state compartidos; esta unidad no los sobrescribe.

Medición unidad: fuente 29 + sección 2 + test 214 + fixture 24 + evidencia 31 = **300 líneas** (adiciones+eliminaciones), reserva 60 ⇒ 360 < 400. Verificación final repetida: 7/7, typecheck, ESLint y Prettier test/fixture PASS; logs locales `/tmp/patient-form-final.log`.
