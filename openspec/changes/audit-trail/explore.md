# Exploration: audit-trail

## Current State

El proyecto ya tiene una base parcial de auditoría, pero no un módulo completo de trazabilidad:

- `apps/api/prisma/schema.prisma` define `AuditLog` con `tenantId`, `userId`, `action`, `entity`, `entityId`, `oldValues`, `newValues`, `changedFields` y `createdAt`. La tabla solo tiene índices básicos por tenant/entidad/fecha; no contiene metadata de request, estado de éxito/fallo, correlación ni mecanismo de integridad/retención.
- `apps/api/src/audit-log/audit-log.service.ts` escribe con un `PrismaClient` independiente para evitar la dependencia circular `PrismaService -> AuditLogService`. Esto permite que el hook actual funcione, pero impide que una mutación financiera y su auditoría compartan la misma transacción.
- `apps/api/src/database/prisma-audit.extension.ts` usa Prisma `$extends` y `RequestContextService` para `create`, `update` y `updateMany` sobre `Patient`, `Doctor`, `User`, `Specialty`, `Service`, `ExpenseCategory`, `DoctorBankAccount`, `ExchangeRate` y `SystemConfig`.
- La extensión registra el nombre de la operación (`CREATE`, `UPDATE`, `UPDATEMANY`), no las acciones de dominio `DEACTIVATE`, `VOID`, `ADJUSTMENT`, `LOGIN`, etc. Captura datos de entrada, no necesariamente el estado persistido final, y no aplica redacción.
- `RequestContextService` solo conserva `userId` y `tenantId` en `AsyncLocalStorage`; no conserva request id, método, ruta, IP, user-agent ni origen.
- Las acciones de dominio relevantes están repartidas entre `auth`, `doctors`, `patients`, `specialties`, `payments`, `expenses`, `medical-records` y `reports`. Varias operaciones financieras son transaccionales, pero el hook de auditoría actual escribe por otra conexión.
- No existe endpoint/controller/UI para consultar auditoría. El frontend sí tiene patrones reutilizables de páginas administrativas, TanStack Query, `apiJson` y permisos en `apps/web/src/features/roles` y `apps/web/src/app/(dashboard)/admin`.
- `openspec/changes/async-local-storage-audit-log/` documenta la decisión previa de usar ALS y una extensión Prisma; esa solución quedó parcial: todavía hay tareas de integración pendientes y no cubre el alcance nuevo.

## Hallazgos y Gaps frente al alcance

### Cobertura de eventos

| Área                            | Estado actual                                                                                                                        | Gap principal                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Pacientes/doctores              | CRUD parcial automático; desactivación es un `update`                                                                                | Emitir `CREATE`, `UPDATE`, `DEACTIVATE` explícitos y tenant-safe                                              |
| Especialidades/servicios/bancos | Algunos modelos están en la lista automática; pivotes y servicios de doctor no están completos                                       | Cubrir relaciones, bancos indirectamente tenant-scoped y cambios de precios/configuración                     |
| Usuarios/roles/permisos         | `User` automático; no hay cobertura equivalente documentada para `Role`, `Permission`, `RoleVersion`                                 | Auditar cambios ACL sin exponer hashes, tokens ni permisos accidentalmente                                    |
| Pagos                           | `Payment` no está en `AUDITED_MODELS`; `voidPayment` cambia Payment, ConsultationPayment, Consultation y LabOrder en una transacción | Un evento de negocio `PAYMENT_VOID` debe describir la operación completa; los ajustes requieren evento propio |
| Egresos                         | `Expense` no está en la lista automática; `void` actualiza por id                                                                    | Registrar `EXPENSE_CREATE` y `EXPENSE_VOID`, incluyendo actor y motivo redactado si corresponde               |
| Consultas/servicios clínicos    | No hay cobertura específica para creación/cambio de consulta, `ConsultationService` ni historia clínica                              | Definir si se audita contenido clínico completo, solo metadata/cambios y acceso/exportación                   |
| Auth                            | Login exitoso, logout, onboarding y fallos no generan auditoría                                                                      | Requiere eventos manuales, incluido actor desconocido para fallos de credenciales                             |
| Verificación/onboarding         | `OnboardingService` y `DoctorsService` realizan creación de usuario, token, activación y verificación SACS                           | Separar `ONBOARDING_SENT`, `ONBOARDING_COMPLETED`, `DOCTOR_VERIFICATION_*` y fallos                           |
| Reportes/exportaciones          | `ReportsController` y exportación de historias no registran acceso/descarga                                                          | Auditar solicitud, generación, descarga y fallo; nunca guardar el blob ni datos clínicos completos            |
| Consulta administrativa         | No existe API ni UI                                                                                                                  | Nuevo módulo backend y página administrativa con filtros, paginación y permiso dedicado                       |

### Seguridad, privacidad y consistencia

1. **Redacción obligatoria:** `Patient.documentId`, teléfonos, emails, cuentas bancarias, tokens de onboarding, `passwordHash`, secretos, cookies, payloads JWT, datos clínicos y referencias sensibles no pueden entrar crudos en `oldValues`, `newValues`, TraceLog ni mensajes de excepción. La redacción debe ser centralizada, allowlist/denylist y aplicada antes de persistir o serializar.
2. **Tenant safety:** `AuditLog` ya tiene `tenantId`, pero `Service`, `ExpenseCategory`, `DoctorBankAccount`, `Permission` y otros modelos son indirectamente tenant-scoped. Toda escritura/consulta debe derivar el tenant desde la entidad o el contexto y toda lectura administrativa debe exigir `tenantId` explícito.
3. **Inmutabilidad real:** Prisma no hace inmutable una tabla. Hace falta política de aplicación (sin update/delete), permiso DB separado para el writer y, si el riesgo lo justifica, trigger/privilegios de PostgreSQL y/o hash encadenado. La API de consulta debe ser read-only.
4. **Atomicidad:** escribir mediante el `PrismaClient` independiente actual puede dejar una operación financiera confirmada sin auditoría, o una auditoría fuera de la transacción que luego se revierte. Para pagos, ajustes, egresos y anulaciones la auditoría debe confirmar o revertir junto con la operación.
5. **Fallos de autenticación:** no hay `tenantId` confiable cuando el tenant slug, email o contraseña son inválidos. El modelo debe permitir eventos de auth sin tenant (`tenantId` nullable) o conservar un tenant resuelto de forma segura sin convertir el fallo en un canal de enumeración.
6. **Datos derivados:** el hook actual usa `args.data`, que puede contener operadores Prisma, `Decimal`, campos omitidos y no incluir defaults/generados. Los eventos de negocio deben preferir snapshots controlados del estado antes/después.

## Affected Areas

- `apps/api/prisma/schema.prisma` — ampliar `AuditLog` y decidir si `TraceLog` es persistente o solamente un sink estructurado; agregar índices/retención y posiblemente constraints.
- `apps/api/src/audit-log/` — evolucionar el servicio a writer de eventos, redactor, catálogo de acciones, consulta paginada y permisos; separar claramente `AuditLog` de `TraceLog`.
- `apps/api/src/database/prisma.service.ts` y `apps/api/src/database/prisma-audit.extension.ts` — conservar automatización solo como baseline CRUD y hacerla compatible con contexto/transacciones, sin duplicar eventos de dominio.
- `apps/api/src/common/context/` y `apps/api/src/auth/guards/jwt-auth.guard.ts` — enriquecer ALS con request metadata; inicializar contexto de forma segura también para requests públicos y fallos.
- `apps/api/src/auth/` — login exitoso/fallido, logout, expiración/invalidación y onboarding público.
- `apps/api/src/doctors/` — creación/actualización/desactivación, cuentas bancarias, verificación SACS y onboarding.
- `apps/api/src/patients/`, `specialties/`, `catalog/`, `roles/` y `app-config/` — acciones CRUD y cambios ACL/configuración.
- `apps/api/src/payments/`, `expenses/`, `medical-records/` y `reports/` — eventos de negocio, atomicidad y redacción de información financiera/clínica.
- `packages/shared/src/interfaces/index.ts` — contratos DTO compartidos si el viewer se sirve al frontend.
- `apps/web/src/app/(dashboard)/admin/` y `apps/web/src/features/` — página de auditoría, service/hook, tabla, filtros, paginación y guardas visuales por permiso.
- Tests Jest existentes en `apps/api/src/**.spec.ts` y tests frontend disponibles — cobertura unitaria, integración con DB y escenarios de tenant/redacción/atomicidad.
- `openspec/changes/async-local-storage-audit-log/` — referencia conceptual y decisiones previas; no debe copiarse sin corregir sus límites transaccionales y de cobertura.

## Approaches

| Approach                                                     | Pros                                                                                                                                                                                      | Cons                                                                                                                                                                                  | Complexity / effort                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **A. Extender el hook Prisma actual para todos los modelos** | Pocos cambios en call sites; cubre CRUD automáticamente; fácil de activar para entidades nuevas                                                                                           | No entiende `VOID`/`DEACTIVATE`/login/export; captura datos de bajo nivel; difícil redacción semántica; `updateMany` pierde entidades; no resuelve atomicidad con el cliente separado | Medium inicial, High de corrección y mantenimiento |
| **B. Eventos explícitos de dominio + hook CRUD limitado**    | Semántica correcta para pagos, auth, clínica, onboarding y reportes; snapshots/razones controlados; permite atomicidad dentro de la transacción; mantiene automatización para CRUD simple | Más puntos de integración y tests; riesgo de olvidar un call site; requiere catálogo y convenciones estrictas                                                                         | **High**, pero menor riesgo funcional              |
| **C. Outbox transaccional + procesador de auditoría**        | La operación y el evento quedan atómicos; permite reintentos, alta disponibilidad y desacoplamiento del writer; bueno para volumen                                                        | Auditoría visible con eventual consistency; agrega tabla, worker/reintentos, idempotencia y operación; más difícil para login/fallos                                                  | High/Very High                                     |
| **D. Trigger PostgreSQL para toda mutación**                 | Protección contra bypass de la aplicación; atomicidad natural; difícil de saltar desde Prisma                                                                                             | No conoce actor/request/acción de dominio sin variables de sesión; redacción semántica compleja; mal encaje para auth, exportaciones y eventos externos                               | High, con alta fricción operativa                  |

## Recommendation

Elegir **B como primera entrega**, con una decisión explícita de atomicidad: un `AuditWriter` debe aceptar el cliente transaccional (`tx`) y las operaciones financieras deben escribir su evento dentro de la misma transacción. Mantener el `$extends` solo para CRUD sencillo y desactivar/evitar sus duplicados cuando exista un evento de dominio explícito. No usar el `PrismaClient` independiente actual para eventos financieros.

Separar responsabilidades:

1. **AuditLog persistente e inmutable:** evento de negocio normalizado, tenant/actor, acción, entidad, entityId, before/after redactado, changedFields, request metadata, resultado y correlación. Crear un catálogo de acciones y una política de redacción única.
2. **TraceLog operativo:** servicio genérico para `traceId`, etapa, duración, resultado, error técnico y contexto no sensible. Por defecto debe alimentar logging estructurado del backend, no duplicar cada fila de `AuditLog`; si se requiere consulta histórica, definirlo como almacenamiento separado con retención propia.
3. **Request context:** ampliar ALS con `requestId/correlationId`, IP normalizada, user-agent limitado, método, ruta y origen; nunca guardar cookies, authorization headers ni body crudo.
4. **Eventos manuales:** pagos/ajustes/anulaciones, egresos, auth, onboarding/verificación, consultas clínicas, reportes/exportaciones y cambios ACL deben emitir eventos con intención de dominio, no depender solo de nombres de operaciones Prisma.
5. **API/UI:** endpoint tenant-scoped con filtros por rango de fecha, actor, acción, entidad, entityId, resultado y texto acotado; paginación estable por `createdAt,id`; permiso dedicado (por ejemplo `audit_logs:read`) y DTO de respuesta ya redactado. La UI reutiliza los patrones administrativos existentes.
6. **Retención/integridad:** definir por configuración/política antes de implementar. La retención no debe borrar silenciosamente evidencia financiera; si existe purga legal, debe ser un proceso autorizado y auditable. Para manipulación, combinar privilegios DB de solo inserción para el writer con controles de migración/operación y, si el threat model lo exige, hash encadenado.

Para `single-pr`, el alcance completo probablemente supera 400 líneas por incluir schema, backend, tests, DTOs y UI. El cambio debe declarar explícitamente `size:exception` antes de apply, tal como pidió el usuario; alternativamente, conviene dividirlo en slices aunque la estrategia indicada sea `single-pr`.

## Risks

- **CRITICAL:** mantener el writer en una conexión independiente deja una ventana de inconsistencia entre operación financiera y evidencia.
- **CRITICAL:** auditoría de valores crudos puede filtrar PII, secretos, credenciales, tokens o historia clínica.
- **HIGH:** agregar modelos a `AUDITED_MODELS` sin distinguir eventos manuales generará duplicados o acciones semánticamente incorrectas.
- **HIGH:** `tenantId` nullable para login fallido debe diseñarse para no habilitar enumeración de tenants/usuarios ni consultas cross-tenant.
- **HIGH:** operaciones que usan nested writes, `updateMany` o transacciones con `tx` no tienen entityId/after-state confiable en el hook actual.
- **HIGH:** ausencia de permisos de roles/lectura de auditoría puede exponer una vista transversal de datos clínicos/financieros.
- **MEDIUM:** request metadata puede contener PII o ser spoofeable detrás de proxy; definir headers confiables y límites de tamaño.
- **MEDIUM:** retención e inmutabilidad son controles de operación/DB, no solo de TypeScript; requieren migración, privilegios y runbook.
- **MEDIUM:** el repositorio tiene cambios sin commit relacionados con `doctor-service-pricing`; el trabajo de implementación debe evitar mezclarlos y no asumir que el estado actual es limpio.

## Ready for Proposal

**Sí.** La siguiente fase debe convertir estos hallazgos en una propuesta con alcance por módulos, política de atomicidad (writer transaccional vs outbox), contrato de redacción, catálogo de acciones, retención/integridad y plan explícito de `size:exception` para la estrategia single-pr.
