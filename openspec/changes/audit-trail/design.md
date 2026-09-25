# Design: audit-trail

## Technical Approach

Evolucionar el módulo existente `apps/api/src/audit-log/` hacia dos salidas separadas: **AuditLog** para evidencia de negocio persistente e inmutable y **TraceLog** para observabilidad operativa de corta retención. La fuente de contexto será `AsyncLocalStorage`; los eventos explícitos cubrirán operaciones clínicas/financieras y el hook Prisma quedará limitado a CRUD baseline de entidades configurables, evitando duplicados. Todo writer aceptará `Prisma.TransactionClient`; pagos, egresos y anulaciones escribirán auditoría dentro de la transacción que cambia el estado.

## Architecture Decisions

| Decisión     | Elección                                                                                                       | Alternativas rechazadas / razón                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Persistencia | PostgreSQL/Prisma, tablas append-only                                                                          | Outbox/worker y almacenamiento externo quedan fuera de alcance; agregan asincronía y riesgo de perder evidencia transaccional. |
| Cobertura    | Eventos de dominio + hook CRUD limitado                                                                        | Auditar cada query produce ruido/duplicados; solo middleware omite resultado de negocio y operaciones financieras compuestas.  |
| Integridad   | `integrityHash` SHA-256 sobre payload canónico; trigger DB bloquea `UPDATE/DELETE`; verificador administrativo | Solo confiar en permisos de aplicación no protege ante SQL directo ni corrupción accidental.                                   |
| Contexto     | ALS con `tenantId`, `userId?`, `correlationId`, `requestId`, ruta/método, IP y user-agent normalizados         | Pasar metadata manualmente por todos los servicios es frágil; no se persisten headers ni tokens completos.                     |
| Privilegio   | `audit_logs:read` tenant-scoped; escritura solo desde writer interno                                           | Permitir acceso por rol genérico expone evidencia sensible; `@Public()` nunca consulta auditoría.                              |

## Model and Data Flow

`AuditLog`: `id`, `tenantId`, `userId?`, `action`, `entity`, `entityId`, `oldValues?`, `newValues?`, `changedFields`, `result`, `correlationId`, `requestId`, `metadata?`, `integrityHash`, `createdAt`. Snapshots pasan por redactor antes de hash/persistencia. `TraceLog`: `id`, `tenantId?`, `userId?`, `correlationId`, `level`, `event`, `route?`, `method?`, `statusCode?`, `durationMs?`, `metadata`, `createdAt`; nunca duplica automáticamente cada AuditLog.

```text
HTTP middleware -> RequestContext ALS -> guard (actor/tenant)
      -> service/domain event -> Redactor -> AuditWriter(tx)
      -> Prisma mutation + AuditLog (misma tx)
      -> TraceWriter (operativo, no bloquea la operación)
```

Eventos mínimos: patient/doctor, consultation/medical-record action, payment/adjustment/void, expense/void, catalog/config changes, ACL/auth/onboarding, verification y report/export. Login fallido puede emitir TraceLog sin tenant; nunca enumera si el tenant no se resolvió. Onboarding registra evento y metadata segura, jamás token.

## Components and Contracts

- `audit-log.service.ts`: fachada compatible hacia `AuditWriter`; eliminar `new PrismaClient()` independiente.
- `audit-writer.ts`: `write(entry, db: Prisma.TransactionClient | PrismaService)`, redacta, calcula hash y crea `auditLog`.
- `trace-writer.ts`: logger estructurado con best-effort y retención corta.
- `audit-catalog.ts`: acciones/entidades permitidas y regla de evento idempotente.
- `audit-redactor.ts`: allowlist por evento + denylist recursiva (`password`, tokens, JWT, secrets, account numbers, document/phone, clinical payload); DTOs de lectura ya redactados.
- `prisma-audit.extension.ts`: solo modelos/operaciones CRUD de catálogo; usa el delegate/transacción correcto, no audita `AuditLog`/`TraceLog`, y no inventa tenant.
- `request-context.interface.ts`/middleware: ampliar ALS y limpiar contexto por request.
- `audit-log.controller/service`: `GET /audit-logs` con filtros tenant, fechas, actor, entity/action, cursor y límite; `@RequirePermission('audit_logs','read')`.
- Frontend `features/audit-logs/{services,hooks,components}` y `app/(dashboard)/admin/auditoria/page.tsx`: TanStack Query, filtros/paginación, sin snapshots sensibles no necesarios; navegación visible solo con permiso.

## File Changes

| Archivo                                                                                              | Acción                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma` + migration                                                          | Ampliar AuditLog; crear TraceLog, índices y trigger append-only.                                |
| `apps/api/src/audit-log/*`                                                                           | Crear writer, redactor, catálogo, trace writer, query DTO/mapper/controller; conservar fachada. |
| `apps/api/src/database/prisma-audit.extension.ts`                                                    | Reducir hook y hacerlo tenant/context/transaction-safe.                                         |
| `apps/api/src/common/context/*`, `main.ts`, auth guards                                              | Correlation/request metadata y actor seguro.                                                    |
| Módulos `payments`, `expenses`, `patients`, `doctors`, `medical-records`, `reports`, `auth`, `roles` | Emitir eventos explícitos en puntos de negocio y pasar `tx` financiero.                         |
| `apps/web/src/features/audit-logs/*`, ruta admin, navegación                                         | Viewer administrativo.                                                                          |
| `packages/shared/src/*`                                                                              | Tipos/enum de acciones y respuesta paginada si se comparte contrato.                            |

## Permissions, Retention and Rollout

Agregar permiso seed `audit_logs:read`, siempre validado por tenant y role version. AuditLog no se purga silenciosamente: retención legal/configurable se ejecuta como operación administrativa explícita, con aprobación, ventana y su propio evento; TraceLog puede retenerse 30 días. Despliegue: migración expand-only, backfill nulo para campos nuevos, activar writer/hook detrás de configuración, validar métricas/redacción y luego habilitar viewer. Rollback desactiva eventos/rutas, conserva logs y no revierte datos financieros.

## Testing Strategy

Unit: redactor, catálogo, hash y contexto. Integration: tenant isolation, trigger append-only, writer con `TransactionClient`, rollback financiero y hook sin duplicados. E2E: permiso/filtros/paginación y viewer; ejecución exclusivamente dentro de Docker.

## Open Questions

- [ ] Confirmar retención legal definitiva y si la base permite rol DB separado para negar `UPDATE/DELETE`.
- [ ] Confirmar nomenclatura final de acciones ACL antes de seed/migración.
