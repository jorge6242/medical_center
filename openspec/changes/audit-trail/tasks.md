# Tasks: audit-trail

## Review Workload Forecast

| Field                   | Value                                       |
| ----------------------- | ------------------------------------------- |
| Estimated changed lines | 1,200–1,800                                 |
| 400-line budget risk    | High                                        |
| Chained PRs recommended | No (user-directed single PR)                |
| Suggested split         | Unidades secuenciales dentro de un único PR |
| Delivery strategy       | single-pr con `size:exception`              |
| Chain strategy          | size-exception                              |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                   | Parallelidad               | Dependencia |
| ---- | -------------------------------------- | -------------------------- | ----------- |
| 1    | Schema, contexto, redactor y contratos | Parcial                    | Ninguna     |
| 2    | Writers, catálogo y hook CRUD          | Secuencial                 | Unit 1      |
| 3    | Eventos por dominio y transacciones    | Parcial por módulo         | Unit 2      |
| 4    | API/UI, tests y rollout                | Secuencial por integración | Units 2–3   |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 **RED:** agregar tests unitarios de ALS aislado, redacción recursiva, catálogo/hash y contratos DTO; enlaza `request-context`, `audit-redaction`, `audit-log`.
- [x] 1.2 Ampliar `apps/api/src/common/context/*`, middleware y `main.ts` con correlation/request metadata normalizada, limpieza ALS y contexto anónimo seguro; enlaza `request-context`.
- [x] 1.3 Modificar `apps/api/prisma/schema.prisma` y crear migración expand-only para `AuditLog`, `TraceLog`, índices, campos nullable y trigger append-only/hash; enlaza `audit-log`, `trace-log`.
- [x] 1.4 Crear tipos compartidos en `packages/shared/src/*` para acciones, resultados, filtros y página cursor; enlaza `audit-log` y `audit-admin-viewer`.

## Phase 2: Core Implementation

- [x] 2.1 Implementar `apps/api/src/audit-log/audit-redactor.ts`, `audit-catalog.ts` y hash canónico con denylist/allowlist; satisfacer redacción central y ausencia de secretos.
- [x] 2.2 **GREEN:** crear `audit-writer.ts` y `trace-writer.ts`, aceptando `PrismaService | Prisma.TransactionClient`; persistir AuditLog atómico y TraceLog best-effort separado.
- [x] 2.3 Reemplazar el `PrismaClient` independiente en `audit-log.service.ts`; conservar fachada y asegurar writer interno, inmutabilidad lógica y DTOs redactados.
- [x] 2.4 Reducir `apps/api/src/database/prisma-audit.extension.ts` a modelos/operaciones CRUD configurados, contexto/transacción activos y supresión de duplicados; enlaza `prisma-audit-middleware`.

## Phase 3: Domain Integration

- [ ] 3.1 Emitir eventos y tests RED/GREEN en `patients`, `doctors`, `specialties`/`services`, `roles`/ACL y usuarios; cubrir CREATE/UPDATE/DEACTIVATE y cambios de catálogo.
- [x] 3.2 Integrar `payments` y `expenses` con eventos explícitos CREATE/COMPLETE/ADJUSTMENT/VOID dentro de la misma `tx`; probar rollback financiero.
- [ ] 3.3 Integrar `medical-records`/consultations, `auth`, `onboarding`/verificación y `reports`/exports; registrar fallos seguros sin tokens, credenciales ni payload clínico.
- [ ] 3.4 Agregar permiso seed `audit_logs:read`, configuración de activación/retención y métricas/logs operativos sin secretos; documentar rollback y retención TraceLog.

## Phase 4: API, UI and Verification

- [x] 4.1 Crear query service/controller/DTO mapper en `apps/api/src/audit-log/*` para `GET /audit-logs`, filtros acotados, cursor estable, `@RequirePermission` y tenant isolation.
- [x] 4.2 Crear `apps/web/src/features/audit-logs/{services,hooks,components}` y `app/(dashboard)/admin/auditoria/page.tsx`; usar TanStack Query, estados loading/empty/error/denied y no persistir datos.
- [ ] 4.3 **REFACTOR:** completar tests integración/E2E Jest en Docker para tenant, permiso, paginación, trigger, hash, redacción, hook sin duplicados y rollback; verificar cada escenario de specs.
- [x] 4.4 Ejecutar migración y validaciones Docker-only (`typecheck`, `lint`, `jest`/coverage); comprobar despliegue expand-only y observabilidad sin secretos. Full baseline failures documented in apply-progress.
