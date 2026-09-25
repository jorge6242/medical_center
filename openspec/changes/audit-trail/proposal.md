# Proposal: Módulo de auditoría clínica-financiera

## Intent

Reemplazar la auditoría parcial por trazabilidad segura y tenant-safe de acciones de usuario y operaciones clínicas/financieras. Éxito: evidencia inmutable, atómica con finanzas y consultable por administradores autorizados.

## Scope

### In Scope

- `AuditLog` persistente/inmutable con catálogo, actor/tenant, entidad, snapshots, cambios, resultado y correlación.
- `TraceLog` separado para trazas operativas no sensibles, sin duplicar cada `AuditLog`.
- Redactor centralizado para PII, secretos, credenciales, tokens, JWT, cuentas bancarias y datos clínicos; DTOs redactados.
- Eventos para pacientes/doctores, pagos/ajustes/anulaciones, egresos, consultas, especialidades/servicios, ACL, auth, onboarding/verificación y reportes/exportaciones.
- `AuditWriter` compatible con `Prisma.TransactionClient`; operaciones financieras auditan dentro de la misma transacción.
- API/UI administrativa tenant-safe con permiso, filtros y paginación; tests en Docker.

### Out of Scope

- Outbox/worker, blobs o indexación externa.
- Borrado físico de entidades clínicas/financieras o purga silenciosa.

## Capabilities

### New Capabilities

- `audit-log`: eventos persistentes, inmutables, redactados y consultables.
- `trace-log`: trazas operativas separadas.
- `audit-redaction`: sanitización central.
- `audit-admin-viewer`: API/UI administrativa tenant-safe.

### Modified Capabilities

- `prisma-audit-middleware`: hook CRUD baseline, sin duplicados, compatible con contexto/transacciones.
- `request-context`: request/correlation metadata segura.
- `onboarding-token-management`: eventos sin persistir tokens.

## Approach

Adoptar eventos de dominio + hook CRUD limitado. Evolucionar `apps/api/src/audit-log/` con writer, catálogo, redactor, consulta y permisos; ampliar ALS; modificar módulos para snapshots. Mantener PostgreSQL/Prisma con solo inserción y política documentada de retención. No usar el `PrismaClient` independiente para finanzas.

## Affected Areas

| Area                    | Impact                                         |
| ----------------------- | ---------------------------------------------- |
| Backend Prisma/NestJS   | Schema, writer, contexto, eventos y atomicidad |
| Shared + frontend admin | DTOs, filtros, paginación y viewer             |
| Tests                   | Tenant, redacción y atomicidad                 |

## Risks

| Risk                               | Mitigation                                                              |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Duplicados u omisiones             | Catálogo, matriz y tests por evento                                     |
| Fuga de datos sensibles            | Redacción única antes de persistir/serializar                           |
| Auditoría fuera de transacción     | Writer recibe `tx`; pruebas de rollback                                 |
| `tenantId` ausente en auth fallido | Evento sin tenant, sin enumeración; consulta con tenant explícito       |
| Cambio >400 líneas                 | **Single-PR con `size:exception` antes de apply**; forecast obligatorio |

## Rollback Plan

Desactivar rutas/UI y eventos manuales por configuración; revertir migraciones solo si es seguro, conservando registros ya escritos. Restaurar el hook baseline sin reintroducir el writer financiero independiente.

## Dependencies

- Resolver en design privilegios DB, retención legal y permiso ACL `audit_logs:read`.

## Success Criteria

- [ ] Toda acción del alcance tiene evento, actor/tenant y resultado.
- [ ] Ningún log persiste PII, secretos, tokens ni historia clínica cruda.
- [ ] Finanzas revierte auditoría junto con la transacción.
- [ ] Viewer filtra y pagina sin cross-tenant.
- [ ] Tests cubren redacción, inmutabilidad, tenant safety y rollback.
