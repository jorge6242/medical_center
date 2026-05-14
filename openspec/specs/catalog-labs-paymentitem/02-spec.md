# Spec: Catálogo de Servicios + Laboratorios + Extensión de Pagos

**Status**: Draft
**Based on**: 01-proposal.md
**Verification**: Manual regression testing required

## Requirements

### REQ-1: Catálogo Público
El sistema provee una API y página pública para ver servicios y precios sin autenticación.

**GIVEN** un visitante no autenticado
**WHEN** accede `GET /catalog/services`
**THEN** retorna lista de especialidades activas con sus servicios y precios

**GIVEN** el visitante selecciona una especialidad en el filtro
**WHEN** aplica el filtro
**THEN** solo muestra servicios de esa especialidad

### REQ-2: CRUD Laboratorios
Admin puede gestionar laboratorios y tests.

**GIVEN** un usuario con permiso `laboratories:create`
**WHEN** envía `POST /laboratories` con `{ name, isActive }`
**THEN** crea el laboratorio

**GIVEN** un usuario con permiso `laboratories:create`
**WHEN** envía `POST /laboratories/:id/tests` con `{ name, priceUsd, isActive }`
**THEN** crea el test asociado al laboratorio

### REQ-3: Orden de Laboratorio (LabOrder)
Un paciente puede solicitar tests de laboratorio sin necesidad de consulta médica.

**GIVEN** un paciente registrado y tests de lab activos
**WHEN** recepción envía `POST /lab-orders` con `{ patientId, labTestIds: [...] }`
**THEN** crea un `LabOrder` con `status = PENDING` y calcula `totalUsd = sum(testPrices)`

**GIVEN** un `LabOrder` con `status = PENDING`
**WHEN** se completa el pago (`POST /payments` con `labOrderId` en `items`)
**THEN** crea un `Payment` con `PaymentItem { itemType: 'LAB', labOrderId }` y `doctorShareUsd = 0`

### REQ-4: Pago de Laboratorio Independiente
Los pagos de lab usan el mismo módulo `Payment` pero sin split de doctor.

**GIVEN** un `LabOrder` pendiente de pago
**WHEN** se procesa el pago
**THEN** `doctorShareUsd = 0` y `centerShareUsd = totalUsd` (100% para el centro)

**GIVEN** la lista de pagos del día
**WHEN** se consulta `GET /payments`
**THEN** incluye tanto pagos de consulta como pagos de laboratorio, cada uno con su `PaymentItem`

### REQ-5: Arquitectura PaymentItem (No Mixtos)
Cada pago es atómico y trazable a un solo servicio.

**GIVEN** un pago de consulta médica
**WHEN** se crea el pago
**THEN** genera un `PaymentItem { itemType: 'CONSULTATION', consultationId }`

**GIVEN** un pago de laboratorio
**WHEN** se crea el pago
**THEN** genera un `PaymentItem { itemType: 'LAB', labOrderId }`

**GIVEN** cualquier pago
**WHEN** se consulta su detalle
**THEN** tiene exactamente UN `PaymentItem` (nunca mixto)

### REQ-6: Permisos
Nuevos permisos requeridos:
- `laboratories:create`, `laboratories:read`, `laboratories:update`, `laboratories:delete`
- `catalog:read` (implícito, público)

### REQ-7: Catálogo Público sin Auth
El endpoint de catálogo no requiere autenticación.

**GIVEN** un request sin JWT
**WHEN** llama `GET /catalog/services`
**THEN** retorna `200` con los datos

### REQ-8: Recibos de Doctor (Consultas solamente)
Los recibos de doctor solo aplican a pagos de consulta médica.

**GIVEN** un pago con `PaymentItem.itemType === 'CONSULTATION'`
**WHEN** se completa el pago
**THEN** genera `DoctorReceipt` y envía email al doctor

**GIVEN** un pago con `PaymentItem.itemType === 'LAB'`
**WHEN** se completa el pago
**THEN** NO genera `DoctorReceipt` ni envía email

### REQ-9: Stats / Home KPIs
Los KPIs del home distinguen entre pagos de consulta y otros tipos.

**GIVEN** el dashboard de inicio
**WHEN** calcula `pendingPayoutDoctors` y `pendingPayoutAmountUsd`
**THEN** solo incluye pagos con `PaymentItem.itemType === 'CONSULTATION'`

### REQ-10: Regresión de Consultas Médicas
El flujo existente de recepción y pago de consultas médicas sigue funcionando.

**GIVEN** un formulario de recepción con paciente, doctor y servicios
**WHEN** se envía el pago
**THEN** funciona idéntico al comportamiento previo, ahora usando `PaymentItem`
