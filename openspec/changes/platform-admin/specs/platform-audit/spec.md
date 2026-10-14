# Delta — auditoría global

## ADDED Requirements

### Requirement: Actor independiente y trazabilidad

El sistema MUST registrar acciones globales mediante PlatformAuditLog/PlatformAdmin, sin FK ficticia a User ni tenant artificial. MUST incluir entidad/id, tenant objetivo si aplica, oldValues/newValues/changedFields, resultado, motivo y request/correlationId; MUST excluir secretos. Consulta MUST estar protegida y paginada.

#### Scenario: Cambio auditado

- GIVEN admin global autenticado modifica centro o suscripción
- WHEN termina la transacción
- THEN persiste auditoría con actor global, tenant objetivo, diferencias y motivo, sin passwords/tokens/cookies.

#### Scenario: Auditoría falla

- GIVEN operación financiera o alta válida
- WHEN falla escritura de auditoría
- THEN la transacción completa revierte y no queda cambio sin trazabilidad.

#### Scenario: Intento anónimo y bootstrap

- GIVEN login fallido o creación inicial por CLI Docker
- WHEN se registra evento
- THEN identifica actor anónimo/SYSTEM según corresponda sin inventar usuario tenant y sin almacenar secretos.

### Requirement: Consulta restringida

Solo sesión platform válida MUST consultar auditoría global; usuarios tenant MUST conservar auditoría tenant existente sin acceso a logs de plataforma.

#### Scenario: Usuario de centro consulta auditoría global

- GIVEN sesión tenant válida
- WHEN solicita /platform/audit
- THEN acceso se rechaza y no filtra eventos de otros centros.

### Requirement: Trazabilidad confiable por realm

Auditoría platform MUST incluir requestId/correlationId generados en servidor y compartidos por escrituras de la operación. MUST NOT tomar encabezado cliente como identidad confiable. Bootstrap/system MUST tener contexto distinto del HTTP.

#### Scenario: Operaciones concurrentes

- GIVEN dos requests platform concurrentes
- WHEN cada request escribe eventos
- THEN los eventos de cada request comparten IDs propios sin mezclarse con el otro request.
