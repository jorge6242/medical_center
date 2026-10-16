# Tasks: Protección frontend por riesgo

> **ESTADO E048 — 2026-10-16 (verificación de alcances E047):** V01/V03/V04/V05/V06/V07/V08/V09/V10 componentes verificados;179tests/21suites,8/24principales completas,16pendientes+2opcionales. Honorarios54C cerrados;0rutas integrales,E2E pendiente;otros alcances requieren autorización.

**Impacto auditado:** [19 fuentes productivas modificadas; no son solo tests](impact-summary.md).

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

- [x] 1.1 Configurar `apps/web/jest.config.ts`, package.json, lock y mounts compose; verificar sensibilidad Docker. E002.
- [x] 1.2 Crear `apps/web/src/test/{setup,render}.ts(x)`, fixtures/handlers MSW aislados; comprobar reset entre tests. E002.
- [ ] 1.3 Resolver contratos V25/V16 y V18/V19 contra código/specs; registrar decisión sin congelar borrado físico (R09/S11).

## 2. Inicio/cobro primero

- [x] 2.1 Probar D/inicio/page.tsx: KPIs y limpiar doctor al cambiar especialidad; V03 (R03/S04,R07/S09). **E007:** diez casos C verdes; errores stats/especialidades/doctores explícitos, sin ceros/vacíos ficticios. Cobro 2.2 y E2E siguen pendientes.
- [ ] 2.2 Probar F/payments/components/consultation-payment-form.tsx una vez: consulta/payload; V03/V04 (R03/S04).
- [x] 2.3 V05 componentes verificados E022:A/B/C=26C,ajustes/anulación/recibo-ID;sin PDFreal,2.2 ni E2E. 5/24principales completas.
  - [x] 2.3.1 V05-A listado/ajustes/anulación:10C verificados independientemente E018.
  - [x] 2.3.2 V05-B PaymentForm real:8C verificados independientemente E020.
  - [x] 2.3.3 V05-C recibos/descarga-ID:8C verificados E022;frontera PDF simulada,no archivo/layout real ni E2E.

## 3. Altas restantes (paralelas tras 1.2)

- [ ] 3.1 A/(auth)/login y A/onboarding: slug, rechazo, token/contraseñas; V01/V02 (R02/S02/S03).
  - [x] 3.1.1 V01 LoginForm/hooks/services:14C+1control API verificados E012,contexto/validación/payload/reintento401/redirect;server/cookies/E2E pendientes. Padre3.1 abierto porV02.
  - [ ] 3.1.2 V02 onboarding: no iniciada ni autorizada en este slice. Subtareas no alteran denominador24.
- [x] 3.2 V04 componentes Agenda/formulario real:25C verificados E014/E016,fecha/estado/turno;sin cobro interno2.2/E2E. Denominador24 intacto.
  - [x] 3.2.1 V04-A página Agenda:17C verificados E014;acciones/IDs/filtros/error/edición/disponibilidad,cobro solo límite ID.
  - [x] 3.2.2 V04-B formulario real:8C verificados E016;selección/validación/Caracas→UTC/disponibilidad/creación/reintento.
- [x] 3.3 V06 componentes verificados E029:22C A/B/C;sin E2E ni backend financiero (R04/S05).
  - [x] 3.3.1 V06-A listado/detalle:9C verificados E025.
  - [x] 3.3.2 V06-B LabOrderForm real:6C verificados E027.
  - [x] 3.3.3 V06-C LabPaymentForm real:7C verificados E029.
- [x] 3.4 V07 componentes verificados E033:23C A/B;sin E2E ni backend financiero (R04/S05/S06).
  - [x] 3.4.1 V07-A listado/detalle/anulación:11C verificadas E031.
  - [x] 3.4.2 V07-B ExpenseForm real:12C verificadas E033.
- [x] 3.5 V08–V10 componentes verificados54C E047,sin PDFreal/E2E/backend financiero (R04/S05/S06).
  - [x] 3.5.1 V08 listado/anulación:10C verificadas E035.
  - [x] 3.5.2 V09-A verificada E037/E039;V09 total28C verificada E043.
    - [x] 3.5.2.1 V09-A1 selección/payload/refetch:6C verificadas E037.
    - [x] 3.5.2.2 V09-A2 catálogos/validación:8C verificadas E039.
  - [x] 3.5.3 V09-B verificada E041/E043;subdivisión root,sin size:exception.
    - [x] 3.5.3.1 B1 registro/pending/reintento/router/cache:4C verificadas E041.
    - [x] 3.5.3.2 B2 preview/PDF/carreras:10C verificadas E043.
  - [x] 3.5.4 V10 verificada16C E045/E047;subdivisión root,sin size:exception.
    - [x] 3.5.4.1 V10-A lectura/query/snapshots:9C verificadas E045.
    - [x] 3.5.4.2 V10-B PDF/carreras:7C verificadas E047.
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
