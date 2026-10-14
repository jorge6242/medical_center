# Tasks: Protección frontend por riesgo

> **IMPLEMENTACIÓN NO INICIADA.** Solo se completó la planificación. Las 24 tareas de implementación siguen pendientes; no se implementaron ni ejecutaron pruebas como parte de este cambio. Se requiere autorización antes de comenzar.

## Review Workload Forecast

| Field                   | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| Estimated changed lines | 2.500–5.000; lock adicional incierto                  |
| Delivery strategy       | ask-on-risk                                           |
| Suggested split         | Bootstrap → Inicio/cobro → altas → medias → navegador |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

Cada tarea funcional es slice candidato de 100–350 líneas con tests/evidencia; dividir si supera 400. Bootstrap 200–350 sin lock: medir lock y resolver excepción/partición, nunca ocultarlo. Navegador requiere slices separados de infraestructura/flujo. Revertir slice completo, sin datos.

## Convenciones

`F/`=`apps/web/src/features/`; `D/`=`apps/web/src/app/(dashboard)/`; `A/`=`apps/web/src/app/`. Suites junto al objetivo de `inventory.md`, extensión `.test.ts(x)`. IDs/R/S remiten al spec. Cada tarea funcional incluye R07/S09 y protocolo RED/GREEN de `progress.md`. No duplicar wrappers.

## 1. Prerrequisitos secuenciales (R01/S01)

- [ ] 1.1 Configurar `apps/web/jest.config.ts`, package.json, lock y mounts compose; verificar sensibilidad Docker.
- [ ] 1.2 Crear `apps/web/src/test/{setup,render}.ts(x)`, fixtures/handlers MSW aislados; comprobar reset entre tests.
- [ ] 1.3 Resolver contratos V25/V16 y V18/V19 contra código/specs; registrar decisión sin congelar borrado físico (R09/S11).

## 2. Inicio/cobro primero

- [ ] 2.1 Probar D/inicio/page.tsx: KPIs y limpiar doctor al cambiar especialidad; V03 (R03/S04).
- [ ] 2.2 Probar F/payments/components/consultation-payment-form.tsx una vez: consulta/payload; V03/V04 (R03/S04).
- [ ] 2.3 Probar F/payments/components/payment-form.tsx y D/pagos/page.tsx: ajustes/anulación/recibo-ID; V05 (R04/S05).

## 3. Altas restantes (paralelas tras 1.2)

- [ ] 3.1 A/(auth)/login y A/onboarding: slug, rechazo, token/contraseñas; V01/V02 (R02/S02/S03).
- [ ] 3.2 F/consultations/components/schedule-consultation-form.tsx: fecha/estado/turno; V04 (R03/S04).
- [ ] 3.3 F/lab-orders/components/: crear/cobrar orden-ID; V06 (R04/S05).
- [ ] 3.4 F/expenses/components/expense-form.tsx y D/egresos: payload/motivo obligatorio; V07 (R04/S05/S06).
- [ ] 3.5 F/doctor-payouts/components/ y D/liquidaciones-doctores: selección/importes/recibo/anulación; V08–V10 (R04/S05/S06).
- [ ] 3.6 D/reportes/page.tsx: filtros/dataset exportado; V11 (R06/S08).
- [ ] 3.7 D/admin/usuarios/page.tsx: UserForm/UserEditForm compartidos, roles/ID; V12–V14 (R05/S07).
- [ ] 3.8 F/tenant-settings/components/tenant-settings-form.tsx: válido/inválido/payload; V15 (R05/S07).

## 4. Medias (paralelas, contratos primero)

- [ ] 4.1 F/patients/components/ y D/pacientes/[id]: validación/desactivar/historial-ID; V16/V17 (R05/S07,R06/S08).
- [ ] 4.2 D/consultas y F/medical-records/components/: filtros/informe/descarga-ID; V18–V20 (R06/S08).
- [ ] 4.3 D/admin/doctores/: precarga/split/validación/acciones-ID; V21–V24 (R05/S07).
- [ ] 4.4 F/specialties/components/: precio/edición/acción confirmada; V25 (R05/S07).
- [ ] 4.5 D/admin/laboratorios/page.tsx: precio/acción-examen; V26 (R05/S07).
- [ ] 4.6 D/catalogo/page.tsx: filtros/precios; V27 (R06/S08).
- [ ] 4.7 D/mi-perfil/page.tsx: validar/guardar/verificar; V28 (R05/S07).
- [ ] 4.8 D/admin/auditoria/page.tsx: filtros/error≠vacío; V29 (R06/S08).

## 5. Verificación secuencial

- [ ] 5.1 `apps/web/playwright.config.ts`, e2e/: habilitar Docker/DB sintética; login→Inicio→cobro, anulación/documento, contexto/redirecciones V32–V34 (R01/R08,S01/S10).
- [ ] 5.2 Auditar inventory.md/progress.md/state.yaml y regresión Docker por escenario (R10/S12).

## Opcionales fuera del denominador

- [ ] O.1 D/admin/roles/page.tsx: expansión/permisos V30 (R08/S10).
- [ ] O.2 D/admin/queues/page.tsx: failed/acceso Bull Board V31 (R08/S10).
