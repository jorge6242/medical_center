# Tasks: Catálogo de Servicios + Laboratorios + PaymentItem Refactor

**Status**: Draft
**Based on**: 03-design.md
**Estimated Effort**: ~600 changed lines across 3 PRs
**Gentle AI Budget**: Each PR < 400 lines (Stacked PRs to main)

---

## Workload Forecast
| Metric | Value |
|--------|-------|
| Estimated changed lines | ~600 |
| 400-line budget risk | **High** — requires split into chained PRs |
| Suggested split | **3 PRs encadenados** |
| Delivery strategy | PR-1 (DB + Core) → PR-2 (Labs Module) → PR-3 (Frontend) |

---

## PR-1: Schema + PaymentItem Core Refactor (~250 líneas)

### Database
- [ ] 1.1 **Migración Prisma**: 
  - Crear `ItemType` enum (`CONSULTATION`, `LAB`)
  - Crear `PaymentItem` model (con FKs opcionales a `Consultation` y `LabOrder`)
  - Agregar `tenantId` directo a `Payment`
  - Crear `LabTestCatalog`, `LabOrder`, `LabOrderTest`, `LabOrderStatus`
  - **Eliminar** `ConsultationService` (migrar datos de snapshot a `PaymentItem` o `Consultation` directo)
  - Revisar `ConsultationPayment` — evaluar si sigue siendo necesario para idempotencia o si `Payment.idempotencyKey` basta
- [ ] 1.2 Regenerar Prisma Client: `make shell-api` → `npx prisma generate`
- [ ] 1.3 Typecheck en API: `make shell-api` → `pnpm run typecheck`

### Backend — Payments Refactor
- [ ] 1.4 **Reescribir `CreatePaymentDto`**:
  - Reemplazar `doctorId`, `servicePriceIds` por `item: PaymentItemDto` (con `itemType`, `description`, campos opcionales según tipo)
  - Mantener `patientId`, `bcvExchangeRate`, `paymentLines`, `idempotencyKey`
- [ ] 1.5 **Reescribir `PaymentResponseDto`**:
  - Reemplazar `consultationId`, `doctorId`, `services` por `item: PaymentItemResponseDto`
  - `item` contiene: `itemType`, `description`, `quantity`, `unitPriceUsd`, `totalPriceUsd`, y campos específicos (`consultationId?`, `labOrderId?`, `services[]?`, `labTests[]?`)
- [ ] 1.6 **Reescribir `PaymentsService.create()`**:
  - Extraer validación de orden a métodos privados: `validateConsultationItem()`, `validateLabItem()`
  - Flujo genérico: validar item → calcular totales → crear `Payment` → crear `PaymentItem` → crear `PaymentDetails`
  - Para consulta: crear `Consultation` + `ConsultationService[]` (o migrar snapshot a `PaymentItem` si se elimina `ConsultationService`)
  - Para lab: `doctorShareUsd = 0`, actualizar `LabOrder.status = PAID`
- [ ] 1.7 **Reescribir `PaymentsService.buildResponse()`**:
  - Genérico: usa `payment.item` para construir respuesta
  - No más condicionales por tipo en el método principal
- [ ] 1.8 **Reescribir `PaymentsService.findAll()` y `findOne()`**:
  - Query directa a `Payment` filtrando por `tenantId` (no más JOIN a `Consultation` para tenant)
  - Include: `item`, `details`, `adjustments`
- [ ] 1.9 **Reescribir `PaymentsService.voidPayment()`**:
  - Genérico: anular `Payment` + `PaymentItem` orden asociada (`Consultation` o `LabOrder`)
- [ ] 1.10 Typecheck + lint limpio en API

### Backend — Receipts Update
- [ ] 1.11 **`ReceiptsService.createForPayment()`**: Validar que `payment.item.itemType === 'CONSULTATION'` antes de generar recibo. Retornar error claro para labs.
- [ ] 1.12 **`ReceiptEmailProcessor`**: Solo procesar emails para pagos de consulta (check `itemType`)

### Backend — Stats Update
- [ ] 1.13 **`StatsService.getHomeStats()`**: Filtrar `pendingPayments` por `item.itemType === 'CONSULTATION'` para `pendingPayout`

### Shared Package
- [ ] 1.14 **Sincronizar o eliminar `CreatePaymentDto` en `packages/shared/src/dtos.ts`**: Actualizar a la nueva estructura con `item` o eliminar si no se usa (verificar usos en web)
- [ ] 1.15 Actualizar `Payment` interface en `packages/shared/src/interfaces/index.ts` si aplica

---

## PR-2: Labs Module + Integration (~200 líneas)

### Backend — Labs Module
- [ ] 2.1 **Crear `LabsModule`**:
  - `LabsController` + `LabsService` + DTOs (`CreateLabTestCatalogDto`, `UpdateLabTestCatalogDto`)
  - Permisos: `laboratories:create`, `laboratories:read`, `laboratories:update`, `laboratories:delete`
  - Endpoints: `POST/GET/PATCH /laboratories`, `POST/GET /laboratories/:id/tests` (usando `LabTestCatalog`)
- [ ] 2.2 **Crear `LabOrdersModule`**:
  - `LabOrdersController` + `LabOrdersService`
  - Endpoints: `POST /lab-orders`, `GET /lab-orders`, `GET /lab-orders/:id`
  - Lógica: validar tests activos, calcular `totalUsd = sum(prices)`, crear `LabOrder` + `LabOrderTest[]`
- [ ] 2.3 Typecheck + lint limpio en API

### Backend — Catalog Module
- [ ] 2.4 **Crear `CatalogModule`** (`@Public()`):
  - `CatalogController` + `CatalogService`
  - Endpoint: `GET /catalog/services` → retorna especialidades activas con `ServicePrice[]` incluyendo `service.name` y `priceUsd`
  - Sin autenticación requerida

### Integration
- [ ] 2.5 **Verificar que `PaymentsService` integra con `LabOrdersService`**:
  - Validar `labOrderId` existe, pertenece al tenant, está en estado `PENDING`
  - Al completar pago: actualizar `LabOrder.status = PAID`
  - Al anular pago: actualizar `LabOrder.status = VOIDED`

---

## PR-3: Frontend + Regresión (~250 líneas)

### Frontend — Services
- [ ] 3.1 **Actualizar `payments.service.ts`**:
  - Interfaces: `PaymentItemDto`, `PaymentItemResponse`, `CreatePaymentDto` (con `item`), `PaymentResponse` (con `item`)
  - Funciones: `getPayments`, `createPayment`, `voidPayment` — adaptadas a nuevo contrato
- [ ] 3.2 **Actualizar `use-payments.ts`**:
  - Hooks genéricos funcionan sin cambios estructurales (solo tipos)
  - Agregar `useLabTestCatalogs` hook si no existe

### Frontend — Pages
- [ ] 3.3 **Actualizar `recepcion/page.tsx`**:
  - Adaptar formulario a nuevo `CreatePaymentDto` (usar `item: { itemType: 'CONSULTATION', description: ..., servicePriceIds: [...] }`)
  - Agregar toggle o tabs: "Consulta médica" / "Laboratorio"
  - Modo lab: seleccionar paciente → seleccionar tests de lab → mostrar total → pagar
- [ ] 3.4 **Actualizar `pagos/page.tsx`**:
  - Render genérico de `payment.item`:
    - Si `itemType === 'CONSULTATION'`: mostrar doctor, servicios, botón recibo
    - Si `itemType === 'LAB'`: mostrar tests de lab, sin doctor/split
  - Mantener funcionalidad de void y adjustments
- [ ] 3.5 **Crear página pública `/catalogo`**:
  - Lista de especialidades con filtro
  - Tabla de servicios con precios
  - Sin autenticación
- [ ] 3.6 **Crear página admin `/admin/laboratorios`**:
  - CRUD de `LabTestCatalog` (tabla + modal crear/editar)
  - Activar/desactivar tests

### Frontend — Regresión
- [ ] 3.7 **Test manual de consulta médica**: Crear paciente → doctor → servicios → pago → verificar recibo generado
- [ ] 3.8 **Test manual de laboratorio**: Crear tests → orden de lab → pago → verificar NO genera recibo
- [ ] 3.9 **Test de anulación**: Anular pago de consulta (debe anular consulta) y pago de lab (debe anular lab order)
- [ ] 3.10 Typecheck + lint limpio en Web: `make shell-web` → `pnpm run typecheck && pnpm run lint`

---

## Notas de Implementación

### Reglas de Negocio
- **Un pago = un item**: Validar en `PaymentsService.create()` que `dto.items.length === 1`.
- **Mutua exclusividad de FKs**: En `PaymentItem`, exactamente uno de (`consultationId`, `labOrderId`) debe estar seteado según `itemType`. Validar en service.
- **Split de doctor**: Solo aplica a `CONSULTATION`. Para `LAB`: `doctorShareUsd = 0`, `centerShareUsd = totalServiceUsd`.
- **Recibos**: Solo para `CONSULTATION`. Para `LAB`: no generar `DoctorReceipt`, no enviar email.
- **Stats**: `pendingPayout` solo cuenta `CONSULTATION`.

### Estructura de Directorios (Nuevo)
```
apps/api/src/
  laboratories/
    labs.controller.ts
    labs.service.ts
    labs.module.ts
    dto/
      create-lab-test-catalog.dto.ts
      update-lab-test-catalog.dto.ts
  lab-orders/
    lab-orders.controller.ts
    lab-orders.service.ts
    lab-orders.module.ts
    dto/
      create-lab-order.dto.ts
  catalog/
    catalog.controller.ts
    catalog.service.ts
    catalog.module.ts
```

### Consideraciones Técnicas
- `ConsultationService` (tabla pivote con snapshot) — evaluar si se mantiene o se migra el snapshot a `PaymentItem.description` + `Consultation.services` (relación directa). Recomendación: mantener `ConsultationService` por ahora para minimizar cambios, pero el snapshot del pago vive en `PaymentItem`.
- `ConsultationPayment` (tabla de idempotencia) — evaluar si su funcionalidad se absorbe en `Payment.idempotencyKey` directamente. Si `Payment` ya tiene `idempotencyKey` @unique, `ConsultationPayment` podría eliminarse. **Revisar si hay alguna razón de negocio para mantenerla** (ej. reintentos de pago parcial).
- `packages/shared` — si `CreatePaymentDto` no se usa en ningún otro lugar del monorepo, eliminarlo. Si se usa, actualizarlo.

### Orden de PRs
1. **PR-1**: Schema + PaymentItem core. Esto rompe temporalmente el frontend hasta que se mergee PR-3.
2. **PR-2**: Labs module + catalog. Independiente del frontend.
3. **PR-3**: Frontend adaptado + regresión. Depende de PR-1 y PR-2.

### Testing Checklist
- [ ] `POST /payments` con consulta médica funciona (regresión)
- [ ] `POST /payments` con lab order funciona
- [ ] `GET /payments` retorna ambos tipos
- [ ] `POST /payments/:id/void` anula consulta y lab correctamente
- [ ] Recibo solo genera para consultas
- [ ] Stats solo cuenta consultas para pending payout
- [ ] Catálogo público funciona sin auth
- [ ] CRUD de labs funciona con permisos
