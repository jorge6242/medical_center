# Exploración: línea base verificada

Fecha: 2026-10-11. Revisión estática; no se ejecutaron suites, builds ni instalaciones.

## Hallazgos

- `apps/web/src/app` contiene 34 `page.tsx`: 31 funcionales y 3 auxiliares. Grupos `(auth)`/`(dashboard)` no forman parte de la URL.
- `apps/web/package.json` contiene lint, format y typecheck, pero no script de testing ni runner declarado. No se encontraron `*.test.*`, `*.spec.*` ni configuraciones Jest/Vitest/Playwright en el workspace web excluyendo dependencias y artefactos Next.
- El contador es de rutas, NO de suites ni cobertura. La recomendación es 29 rutas funcionales con cobertura de comportamiento, 2 diferidas y 3 sin suite propia.
- Wrappers existentes montan `DoctorCreatePage`, `DoctorEditPage`, `DoctorDetailPage`, `PatientMedicalRecordsPanel`, `ConsultationDetailPanel`, `MedicalRecordDetailPanel`, `DoctorPayoutDetailPanel` y `TenantSettingsForm`. Probar sus componentes no exige otra suite idéntica de `page.tsx`.
- `UserForm`/`UserEditForm` están exportados desde la página de usuarios; alta y edición los reutilizan. No inventar una capa feature inexistente para la línea base.
- `egresos/page.tsx` bloquea anulación cuando `voidReason.trim()` está vacío: caso de alto valor y observable.
- `login/page.tsx` obtiene `x-tenant-web-slug` y lo entrega a `LoginForm`: resolución server/contexto exige prueba de integración o E2E además del formulario.

## Contratos pendientes, no bugs confirmados

- `especialidades/page.tsx` expone `usePermanentlyDeleteSpecialty`; `specialties.service.ts` llama `DELETE /specialties/:id/permanent`. Contradice la prohibición documental de borrar entidades de negocio. Verificar política/backend y decidir antes de escribir una expectativa; este plan no avala borrado físico ni modifica código.
- Algunas páginas contienen lógica directa (`apiJson` en Inicio/Catálogo, `try/catch` en onboarding). No convertir el plan de tests en refactor general: sólo extracción mínima futura si habilita comportamiento comprobable.
- Specs existentes de consultas/pagos describen contratos históricos; el componente actual de `/consultas` consume `usePaidConsultations`. Confirmar contrato vigente antes de afirmar parámetros/endpoint específicos.
- La clasificación de prioridades es recomendación por riesgo, no resultado de pruebas ejecutadas. El runner frontend queda a definir en design, no se hereda Jest API automáticamente.

## Decisión recomendada

Infraestructura primero; componentes/integración para formularios, hooks y acciones; unitarias únicamente para lógica propia; E2E para Inicio → cobro, autenticación/contexto y operaciones financieras críticas. No usar mocks frontend para demostrar aislamiento real de tenant, idempotencia o cálculos autoritativos de API.

## Fuentes

`apps/web/package.json`; rutas enumeradas en `inventory.md`; `openspec/specs/{payment-list-ssp,consultations-list-ssp,data-table-ssp,onboarding-token-management}/spec.md`; reglas de `AGENTS.md`. El inventario referencia el componente real de cada vista.

## Corrección de atribución por vista

- V08 muestra listado, enlace de detalle y anulación por estado/motivo; no contiene filtros propios.
- V21 contiene callbacks verificar e invitar; V23 sólo detalle, carga/error y navegación a edición.
- V31 muestra indicadores y abre Bull Board. `useQueueStatuses` no configura `refetchInterval`; no se propone polling como comportamiento existente.
