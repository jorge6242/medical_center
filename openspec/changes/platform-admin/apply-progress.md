# Apply progress — 2026-10-12

## Autorización y alcance

El usuario autorizó continuación automática y **un único cambio grande**: “mejor un unico cambio grande”, tras advertencia de presupuesto >400 líneas. Estrategia `exception-ok`, `size:exception` humana para este cambio; no autoriza commits, PR, build, acceso/deploy de producción ni operaciones destructivas.

Se preservó la implementación previa y sus cambios no relacionados. Fuente de verdad física OpenSpec; Engram no disponible.

## Implementación de este batch

- Dashboard real SaaS: servicio/hook/query/UI, mes Caracas, loading/error/retry; sin clínica.
- Contrato, períodos, facturas/pagos y auditoría con snapshots/actor/objetivo y navegación.
- Historiales paginados independientemente, totales scoped y orden estable.
- Error HTTP conserva status. Intentos idempotentes congelan payload/key en RAM; errores ambiguos no rotan clave ni aceptan payload nuevo. Reintento original explícito, aviso de salida, pagos/anulación no cierran modal mientras pendiente/incierto.
- Alta de centro usa la misma política, sin password persistida fuera de RAM.
- Proxy `/api/platform/*` same-origin para cookie host-only; tenant API permanece igual. Rutas admin/tenant/local verificadas automáticamente.
- Runbook `docs/platform-admin-operations.md` con límites, configuración, despliegue pendiente y rollback conservador.

## Evidencia TDD inicial

| Unidad                     | Safety net                 | RED                                                            | GREEN / triangulación                                                            |
| -------------------------- | -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Backend previo             | 15 suites / 85 tests       | N/A baseline                                                   | 85 verdes antes de cambios                                                       |
| Intento idempotente        | archivo nuevo              | helper inexistente; luego 2 nuevos casos fallaron              | 6 casos: red perdida, payload editado, 5xx/409, validación, éxito, 401 posterior |
| Error API / proxy          | sin suite previa web       | status faltante (2 fallos), URL proxy faltante (1 fallo)       | 3 casos verdes                                                                   |
| Routing admin/tenant/local | sin suite previa           | tests de regresión añadidos después del cambio, no afirmar RED | 3 casos verdes                                                                   |
| Paginación contrato        | tests existentes           | 6 nuevos fallos                                                | 15 casos verdes tras implementación                                              |
| UI React                   | no runner React disponible | no tests de componentes                                        | typecheck/lint y smoke GET; validación visual pendiente                          |

Pruebas web son ejecutables con Node20 y TypeScript ya instalados en Docker, sin agregar dependencias. No se debe confundir pruebas de funciones/API/routing con tests de interacción real de formularios.

## Pendiente de cierre

Verificación independiente + matriz manual navegador de dos tenants, DNS/TLS/headers/cookies producción, despliegue y rollback de aplicación anterior en entorno autorizado. No se comprobaron operaciones sobre centros reales de producción.

## Verificación ejecutada en Docker

- Baseline previo: 15 suites/85 pruebas plataforma verdes.
- Paginación: 6 RED → 15 GREEN de subscription service.
- Dashboard OVERDUE: 2 RED → 4 GREEN del servicio dashboard; incluye vencidas, excluye pagadas/anuladas.
- Web nativo: 12 tests verdes (6 intentos, 3 HTTP/error/proxy, 3 routing).
- E2E opt-in: `env NODE_ENV=test PLATFORM_DB_TESTS=1 pnpm exec jest --config test/jest-e2e.json --runInBand platform-payment-concurrency platform-realm-regression`: 2 suites/5 tests verdes. DB PostgreSQL real con fixtures UUID/cleanup scoped; HTTP aislado usa guards reales y mocks de fronteras DB/PlatformAuthService, no credenciales reales.
- Preflight local read-only: 0 conflictos webSlug admin, Prisma 43 migraciones/up-to-date.
- GET smoke Next dev: `/platform/login`200, `/platform`200, proxy `/api/platform/auth/me`401 y dashboard401 sin sesión, API directa401.
- Next dev requirió reinicio del contenedor web para incorporar rewrite (sin build). Validator generado `.next/dev/types/validator.ts` estaba corrupto al reiniciar; eliminado sólo ese cache generado y reiniciado para regenerar; comprobar typecheck final en salida posterior.
- Full backend suite (antes del fix OVERDUE): 52 suites passed/5 failed, 226 tests passed/5 failed. Fallos en pacientes/doctor-payouts/reportes fuera de archivos modificados por este batch; no se corrigieron ni se afirma suite global verde. `Reflect.getMetadata` en reportes y fixtures/assertions desactualizados en pacientes/payouts.
- Lint API completo verde; lint web completo falla con 6 errores/3 warnings ajenos a plataforma en lab-payment-form, medical-record-dynamic-form y reportes. Lint específico de archivos de este batch verde.

## Límites y decisiones

No se ejecutó build, commit, PR, despliegue ni mutación sobre centros reales. Tests DB insertan/borran únicamente fixtures descartables propios. Idempotencia incierta se conserva en RAM: pérdida forzada de contexto requiere conciliación manual; no prometer garantía durable a través de cierre/recarga. Rotación de secreto HMAC exige conciliar intentos pendientes.

## Key Learnings

1. Una cookie SameSite=Lax contra API Railway cross-site requería proxy same-origin para el panel; no cambiar política tenant para resolverlo.
2. Los reintentos inciertos deben conservar payload además de key; 401 posterior no demuestra que el primer cobro falló.
3. El saldo SaaS abierto debe incluir OVERDUE y la facturación calendario usa Caracas.

## Resultado final del batch

- Plataforma backend: **15 suites / 92 tests verdes**.
- HTTP/concurrencia DB aislada: **2 suites / 5 tests verdes**.
- Web nativo funciones/API/routing: **12 tests verdes**.
- Typecheck API y web: **verdes** después de regenerar validator cache Next. Lint API completo y lint específico de archivos web modificados: **verdes**. Diff check sin errores.
- Full web lint y full backend suite mantienen fallas ajenas documentadas; 4.2/verificación global no se consideran cerradas.

## Batch de fixes de revisión independiente

- Corregidos cuatro bloqueantes: intentos perdidos por hard401/unmount; snapshots/continuidad de período fuera de lock; VOID concurrente/OVERDUE; audit trace ausente.
- Recovery persistente en módulo RAM scoped actor/operación + root SPA listener y banner global con CSRF actual. Nunca localStorage/password persistida. Tests verifican registry/executor/evento, NO interacción integral React. UI manual sigue pendiente.
- Suscripción: unit20 y DB2 período concurrente; pagos/math unit14 y DB3 concurrentes; audit2 context tests.
- Verificación e2e final: 3 suites/9 tests verdes (2 período,3 pago/void,4 HTTP realm).
- Evidencia completa y comandos en verify-report.md. No archivar.

### Cierre de fixes

106 tests platform+guard,9 e2e HTTP/DB,16 web nativos verdes. API/web typecheck y API lint/web scoped verdes. Sin build, commit, producción ni archive. No se midió nuevamente coverage; porcentaje inicial parcial no demuestra cumplimiento total. Reverificación por agente separado solicitada al coordinador.

## Bugfix: IDs históricos de tenant (2026-10-12)

- Causa: `Tenant.id` es Prisma `String @default(uuid())`, no una columna UUID. Seeder persiste `tenant-demo-001`; `ParseUUIDPipe`/`IsUUID` en plataforma rechazaban registros existentes antes del servicio.
- Fix quirúrgico: pipe y decorador compartidos para ID opaco de 1–128 caracteres, sin whitespace/control ni separadores de URL (`/`, `\`, `?`, `#`). Aplicados SOLO a parámetros de tenant en tenants/suscripciones y filtro targetTenantId de auditoría. invoiceId/paymentId conservan UUID. No se migraron IDs ni modificaron guard/session/filtros de pertenencia.
- TDD RED: suite HTTP nueva, 9 fallas/3 verdes antes del fix (400 en lugar de éxito para ID sembrado). GREEN: 12 tests de identificadores +4 regresiones de realms, 2 suites/16 tests verdes. Validación HTTP real (pipes, DTOs, CSRF); identidad y límites de servicios mockeados, sin mutaciones de DB. Cubre detalle/update/activation/contrato/status/período/pago/void/audit, unknown ID404 desde boundary del servicio, malformed/129 caracteres400 y payment UUID estricto. Servicios reales conservan NotFoundException al no encontrar registro.
- Comandos Docker: `docker compose -f docker-compose.dev.yml exec -T api pnpm exec jest --config test/jest-e2e.json --runInBand platform-tenant-identifiers platform-realm-regression`; `pnpm run typecheck`; `pnpm run lint` dentro de API: verdes. Sin build/deploy/commit. QA externa previamente pendiente permanece pendiente.

## Seed UUID nuevo y compatibilidad histórica (2026-10-12)

- Pedido humano: los nuevos tenants creados por seeds deben tener UUID válido. Constante compartida `prisma/seeders/demo-tenant.constants.ts`: `a174b163-08d8-4d24-8d83-f918b66ee2a1` (UUID v4 determinístico).
- `seedTenant` resuelve primero la identidad persistida por ID legacy, ID canónico y los dos slugs reales del flujo (`centro-medico-demo`, `centro-medico-demo-demo`). Reusa PK/FK existentes; si las identidades apuntan a más de un tenant, falla cerrado antes de escribir. Solo ausencia total crea nuevo UUID mediante upsert por slug. No hay migración/reset/rewrite de IDs históricos.
- `seedDatabase` extraído como orquestador testeable; seed.ts conserva adapter/client/catch/disconnect. ID resuelto se pasa explícitamente a roles/config, usuarios, catálogos, doctores, pacientes, BCV, recordatorios y todas las relaciones demo; se eliminan las constantes literales por helper. El segundo seed conserva renombrado final de slug existente. Seeds reutilizables de provisioning reciben el ID explícito sin cambiar sus defaults ajenos.
- TDD: RED 5 tests de identidad y1 propagación fallaron antes del fix; GREEN 3 suites/8 tests con mocks (UUID válido, segundo run sin duplicado, ambos slugs legacy/IDs existentes, ambigüedad fail-closed, propagación orquestador base y demo). Comando Docker API: `pnpm exec jest --config test/jest-e2e.json --runInBand demo-tenant-seed demo-seed-scope seed-database-scope`. API `pnpm run typecheck`, `pnpm run lint`, diff check: verificación final registrada por executor.
- Gotcha: demo-consultations ya borra/recrea consultas/pagos del tenant demo en el seed preexistente. NO se ejecutó prisma seed ni reseed contra DB real, dev o producción; pruebas usan mocks. Este cambio no intenta volver ese proceso no destructivo ni cambia contraseñas/datos/IDs de otras entidades. Migraciones históricas que referencian legacy no se editan.
