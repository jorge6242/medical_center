# Proposal: Catálogo de Servicios + Laboratorios + Extensión de Pagos

**Status**: Draft
**Scope**: Backend + Frontend
**Estimated Effort**: ~600 changed lines across 3 PRs
**Gentle AI Strategy**: Stacked PRs to main (each PR < 400 lines)

## Intent
Permitir a potenciales clientes consultar precios de servicios sin registrarse, y agregar un módulo de laboratorios con pago independiente mediante una arquitectura de pagos escalable.

## Scope

### In Scope
- **Catálogo Público (`/catalogo`)**: Página pública (sin login) que lista especialidades → servicios → precios. Filtro por especialidad.
- **Módulo Laboratorios**: CRUD de laboratorios y tests con precio.
- **Orden de Laboratorio (`LabOrder`)**: Crear una orden de lab para un paciente, generando un `Payment` **independiente**.
- **Refactor de Pagos**: Migrar de FKs opcionales a `PaymentItem` (1 item por pago, no mixtos).
- **Frontend Admin**: Página para gestionar labs (`/admin/laboratorios`).

### Out of Scope
- Resultados de laboratorio (PDFs, rangos de referencia, valores).
- Flujo de toma de muestras, tracking de estado de muestra.
- Integración con equipos de laboratorio (HL7/FHIR).
- Catálogo con búsqueda full-text o filtros avanzados (solo filtro por especialidad).
- Vincular laboratorio a consulta (caso aislado, no justifica complejidad).
- Split de ingresos en labs (100% va al centro, `doctorShareUsd = 0`).
- Pagos mixtos (consulta + lab en un solo pago).

## Capabilities

### New Capabilities
- `public-services-catalog`: Ver precios sin autenticación.
- `laboratory-management`: CRUD de labs y tests.
- `lab-order`: Crear orden de lab para un paciente con su propio pago independiente.
- `payment-lab`: Generar pago de laboratorio (doctorShareUsd = 0).

### Modified Capabilities
- `payments-list`: Mostrar tanto pagos de consulta como pagos de lab (render genérico de items).
- `payment-detail`: Mostrar item type (`CONSULTATION` | `LAB`) y detalles específicos.
- `receipt-generation`: Solo genera recibo de doctor para items tipo `CONSULTATION`.

## Approach
1. **Catálogo Público**: Endpoint público `GET /catalog/services` (sin auth) + página Next.js pública.
2. **Modelo Lab**: `LabTestCatalog` (tests con precio, sin relación a lab externo) + `LabOrder` (orden para paciente) + `LabOrderTest` (snapshot de tests ordenados).
3. **Arquitectura de Pagos**: `PaymentItem` como tabla polimórfica de líneas. Cada pago tiene exactamente 1 `PaymentItem` (restricción de no mixtos). El item tiene `itemType: 'CONSULTATION' | 'LAB'` y FK opcional según tipo.
4. **Unificación**: `PaymentsService` usa `PaymentItem` para todo — creación, búsqueda, respuesta y anulación son genéricos.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` | **High** | Nuevos modelos `LabTestCatalog`, `LabOrder`, `LabOrderTest`, `PaymentItem`. Elimina `ConsultationService` (migra a PaymentItem). |
| `apps/api/src/laboratories/` | New | Módulo completo NestJS |
| `apps/api/src/payments/` | **High** | Servicio reescrito para usar `PaymentItem`. DTOs genéricos. |
| `apps/api/src/receipts/` | **High** | Solo genera recibo si `PaymentItem.itemType === 'CONSULTATION'`. |
| `apps/api/src/stats/` | **Medium** | `pendingPayout` filtra por `itemType === 'CONSULTATION'`. |
| `apps/web/src/app/catalogo/` | New | Página pública de catálogo |
| `apps/web/src/app/(dashboard)/admin/laboratorios/` | New | CRUD admin de labs |
| `apps/web/src/app/(dashboard)/recepcion/` | **High** | Adaptar formulario a nuevo DTO con `items`. |
| `apps/web/src/app/(dashboard)/pagos/` | **Medium** | Render genérico de `PaymentItem`. |
| `packages/shared/` | **Medium** | Sincronizar/eliminar `CreatePaymentDto` obsoleto. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Refactor de pagos afecta funcionalidad existente | Medium | Tests manuales de consulta médica + lab. Fase de pruebas sin datos reales. |
| `PaymentItem` introduce complejidad inicial | Low | 1 item por pago (no mixtos) mantiene simplicidad. DTOs y service genéricos. |
| Frontend shared package desincronizado | Medium | Eliminar o sincronizar `CreatePaymentDto` en `packages/shared/src/dtos.ts`. |

## Rollback Plan
1. Revertir migración Prisma (eliminar `PaymentItem`, `LabTestCatalog`, `LabOrder`, `LabOrderTest`).
2. Restaurar `payments.service.ts`, DTOs y schema desde git.
3. Eliminar rutas y componentes nuevos.

## Extensibilidad Futura
- `PaymentItem` ya soporta tipos nuevos: agregar `'PHARMACY'`, `'IMAGING'`, `'PHYSIOTHERAPY'` al enum `ItemType`.
- Cada tipo nuevo requiere: tabla Order + campos opcionales en `PaymentItem`.
- `PaymentsService` NO cambia — es genérico.
- El esfuerzo por tipo nuevo se reduce de ~3-4h a ~1.5-2h.

## Dependencies
- `@nestjs/schedule` ya instalado.
- Sin librerías nuevas.

## Success Criteria
- [ ] `GET /catalog/services` retorna especialidades y servicios sin auth.
- [ ] Página `/catalogo` muestra lista filtrable por especialidad.
- [ ] Admin puede crear/editar/desactivar labs y tests.
- [ ] Recepción puede crear orden de lab con pago independiente.
- [ ] Pago de consulta médica sigue funcionando igual (regresión).
- [ ] `GET /payments` incluye pagos de consulta y lab con `itemType` visible.
- [ ] Recibo de doctor solo genera para pagos de consulta.
- [ ] Typecheck + lint limpio en API y Web.

## Chained PR Plan

```
main
 └── #PR-1 Schema + PaymentItem Core
      └── #PR-2 Labs Module + Catalog
           └── #PR-3 Frontend + Regresión
```

| PR | Scope | Estimated Lines |
|----|-------|-----------------|
| PR-1 | Schema + PaymentItem Core Refactor | ~250 |
| PR-2 | Labs Module + Catalog API | ~200 |
| PR-3 | Frontend + Regresión Tests | ~250 |

**Strategy**: Stacked PRs to main (each < 400 line budget)
