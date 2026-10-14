# Delta — administración de centros

## ADDED Requirements

### Requirement: Operación global acotada

PlatformAdmin MUST listar/detallar datos operativos, crear y editar centros sin acceso clínico ni impersonación. MUST validar slugs únicos/reservados, email y versiones; slug interno MUST ser inmutable en V1.

#### Scenario: Vista global segura

- GIVEN un administrador global autenticado
- WHEN consulta listado, detalle o dashboard
- THEN ve identidad/estado y métricas SaaS, nunca pacientes, consultas, cobros médicos ni credenciales.

#### Scenario: Edición inválida o concurrente

- GIVEN un webSlug ocupado/reservado o expectedVersion anterior
- WHEN intenta editar un centro
- THEN recibe 400/409 sin sobrescribir cambios previos.

### Requirement: Aprovisionamiento atómico e idempotente

Alta MUST crear tenant, roles/configuración, admin inicial y suscripción/período/factura en una transacción auditada, sin datos demo. MUST NOT hacer upsert de centros existentes ni resetear contraseñas al reintentar.

#### Scenario: Alta completa

- GIVEN DTO válido y plan activo existente
- WHEN se crea centro con Idempotency-Key nueva
- THEN se crean todas las entidades necesarias y devuelve respuesta saneada sin password.

#### Scenario: Fallo y reintento

- GIVEN fallo en configuración, suscripción o auditoría durante alta
- WHEN aborta la transacción
- THEN no queda centro parcial; repetir una alta completada con misma clave/payload devuelve resultado existente, y payload distinto devuelve 409.

### Requirement: Activación deliberada y persistencia

Estado Tenant.isActive MUST cambiar solo por operación explícita con motivo y confirmación, independiente de subscription.status. MUST NOT borrar centro ni datos financieros/clínicos.

#### Scenario: Suspensión intencional

- GIVEN centro activo y operador confirma desactivación con motivo
- WHEN se aplica operación auditada
- THEN isActive=false y autenticación tenant rechaza acceso según comportamiento actual, conservando datos.

#### Scenario: Estado comercial independiente

- GIVEN centro activo
- WHEN cambia subscription.status a PAST_DUE o SUSPENDED
- THEN isActive no cambia automáticamente ni se interrumpe su login por una nueva regla comercial.

### Requirement: Alta incierta sin nueva identidad

Formulario de alta MUST usar la misma política de intento original inmutable ante respuesta perdida y MUST NOT persistir contraseña en localStorage.

#### Scenario: Alta confirmada con respuesta perdida

- GIVEN centro creado en servidor y respuesta perdida
- WHEN se reintenta la operación original
- THEN usa la misma key/payload y recupera resultado sin crear otro centro ni resetear credenciales.
