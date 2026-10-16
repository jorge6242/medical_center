# Inventario trazable de vistas

**E048 — 2026-10-16 (verificación de alcances E047):** 34rutas:20recomendadas sin iniciar+9con C verificada y alcance integral pendiente;2diferidas,3auxiliares,0rutas integrales. 174C+1API+4infra=179tests/21suites;8/24principales completas,16pendientes+2opcionales. V08=10,V09=28,V10=16 verificados;V02/2.2/E2E pendientes.

**Impacto auditado:** [resumen de cambios productivos y límites](impact-summary.md).

## Lectura y seguimiento

Fuente abreviada: `D/` = `apps/web/src/app/(dashboard)/`; `A/` = `apps/web/src/app/`. Cada ruta indicada bajo D/A tiene archivo `page.tsx`. Componentes nombrados están importados por esa fuente (o definidos allí); no suponen suites separadas.

- **U**: unitaria para validaciones/transformaciones propias, si existen; no replicar cálculos de API.
- **C**: componente/integración con interacciones y límites HTTP controlados; incluye hooks/services relevantes.
- **E**: E2E complementaria para navegación/contexto o flujo real; no una E2E obligatoria por fila.
- `pendiente`: cobertura futura recomendada; `diferida`: baja prioridad fuera del primer alcance; `sin-suite-propia`: wrapper auxiliar sin comportamiento que justifique unitaria.
- Para avanzar una fila registrar escenarios, tarea, archivo de test, comando Docker, fecha y resultado. No marcar `verificada` por existencia del archivo ni por test de backend. Las suites compartidas pueden referenciar varios IDs.

## Prioridad alta — 15

| ID  | URL                             | Fuente / componente objetivo                                           | Capa  | Comportamiento útil / riesgo                                                                              | Estado                                                 |
| --- | ------------------------------- | ---------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| V01 | `/login`                        | A/(auth)/login; `login-form.tsx` / LoginForm                           | U+C+E | Validación, errores y contexto slug correcto; sesión en centro equivocado                                 | C verificada E012:14C+1control API;server/E pendientes |
| V02 | `/onboarding`                   | A/onboarding; OnboardingPage                                           | U+C+E | Contraseñas coincidentes, token ausente/servicio rechazado; activación inválida                           | pendiente                                              |
| V03 | `/inicio`                       | D/inicio; InicioPage / SpecialtyConsultation / ConsultationPaymentForm | C+E   | KPIs con fixtures conocidas, carga/error, selección especialidad-doctor; demo engañosa o cobro equivocado | C 2.1 verificada E007; cobro/E pendientes              |
| V04 | `/agenda`                       | D/agenda; ScheduleConsultationForm / ConsultationPaymentForm           | U+C+E | Fechas, acciones por estado, consulta seleccionada; turno/cobro incorrecto                                | C verificada E014/E016:A17+B8=25;sin cobro2.2/E2E      |
| V05 | `/pagos`                        | D/pagos; PaymentForm / acciones de tabla / recibo                      | U+C+E | Validación, ajustes, anular y recibo del pago seleccionado; daño financiero                               | C verificada E022:A10+B8+C8=26;PDFreal/E2E pendientes  |
| V06 | `/laboratorio/ordenes`          | D/laboratorio/ordenes; LabOrderForm / LabPaymentForm                   | U+C+E | Crear y cobrar orden seleccionada, estados pendientes/error; cobro incorrecto                             | C verificada E029:22C A9+B6+C7;sin E2E                 |
| V07 | `/egresos`                      | D/egresos; ExpenseForm / confirmación anulación                        | U+C+E | Datos válidos, motivo vacío impide mutación, ID correcto; egreso/anulación accidental                     | C verificada E033:23C A11+B12;sin E2E                  |
| V08 | `/liquidaciones-doctores`       | D/liquidaciones-doctores; DoctorPayoutsPage                            | C+E   | Listado, enlace al detalle y anulación según estado/motivo; liquidación equivocada                        | 10C verificadas E035;E2E pendiente                     |
| V09 | `/liquidaciones-doctores/nueva` | D/liquidaciones-doctores/nueva; DoctorPayoutForm                       | U+C+E | Consultas seleccionadas e importes presentados/enviados; honorarios incorrectos                           | 28C verificadas E037/E039/E041/E043;E2E pendiente      |
| V10 | `/liquidaciones-doctores/[id]`  | D/liquidaciones-doctores/[id]; DoctorPayoutDetailPanel                 | C+E   | Detalle/recibo del ID solicitado, error/no encontrado; documento equivocado                               | C verificada16C E045/E047;PDFreal/E2E excluidos        |
| V11 | `/reportes`                     | D/reportes; ReportesPage / hooks / exportación                         | U+C+E | Filtros/pestañas y dataset enviado a exportar; informe incorrecto                                         | pendiente                                              |
| V12 | `/admin/usuarios`               | D/admin/usuarios; UsuariosPage / UserForm / UserEditForm               | C+E   | Usuario seleccionado, roles asignables y desactivación; acceso erróneo                                    | pendiente                                              |
| V13 | `/admin/usuarios/nuevo`         | D/admin/usuarios/nuevo; UserForm importado de ../page                  | U+C   | Validación y rol enviado; cuenta inválida; suite compartida V12                                           | pendiente                                              |
| V14 | `/admin/usuarios/[id]/editar`   | D/admin/usuarios/[id]/editar; UserEditForm importado de ../../page     | U+C+E | Usuario resuelto por ID y datos enviados; editar cuenta ajena; suite compartida V12                       | pendiente                                              |
| V15 | `/admin/configuracion-centro`   | D/admin/configuracion-centro; TenantSettingsForm                       | U+C   | Validación y payload guardado; configuración incorrecta                                                   | pendiente                                              |

## Prioridad media — 14

| ID  | URL                           | Fuente / componente objetivo                                  | Capa | Comportamiento útil / riesgo                                                                     | Estado    |
| --- | ----------------------------- | ------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ | --------- |
| V16 | `/pacientes`                  | D/pacientes; PatientForm / PatientToolbar / acciones          | U+C  | Validar datos, búsqueda/selección y desactivar ID correcto; ficha equivocada                     | pendiente |
| V17 | `/pacientes/[id]`             | D/pacientes/[id]; PatientMedicalRecordsPanel                  | C+E  | Historial del paciente solicitado y errores; confundir datos clínicos                            | pendiente |
| V18 | `/consultas`                  | D/consultas; MedicalRecordsCreatePanel / usePaidConsultations | C    | Filtros y consulta seleccionada para informe; informe asociado incorrectamente                   | pendiente |
| V19 | `/consultas/[id]`             | D/consultas/[id]; ConsultationDetailPanel                     | C+E  | Detalle/acciones para ID y no encontrado; consulta equivocada                                    | pendiente |
| V20 | `/medical-records/[id]`       | D/medical-records/[id]; MedicalRecordDetailPanel              | C+E  | Informe correcto y datos destinados a descarga; documento clínico equivocado                     | pendiente |
| V21 | `/admin/doctores`             | D/admin/doctores; DoctorToolbar / acciones                    | C    | Filtros, selección, desactivar, verificar e invitar doctor correcto; operación sobre otro doctor | pendiente |
| V22 | `/admin/doctores/nuevo`       | D/admin/doctores/nuevo; DoctorCreatePage                      | U+C  | Validación y payload del alta; ficha inválida                                                    | pendiente |
| V23 | `/admin/doctores/[id]`        | D/admin/doctores/[id]; DoctorDetailPage                       | C    | Detalle del ID, carga/error y navegación a editar; ficha equivocada                              | pendiente |
| V24 | `/admin/doctores/[id]/editar` | D/admin/doctores/[id]/editar; DoctorEditPage                  | U+C  | Precarga y edición del ID correcto; split/datos incorrectos                                      | pendiente |
| V25 | `/especialidades`             | D/especialidades; SpecialtyForm / acciones                    | U+C  | Precio/edición y desactivación; resolver contrato de borrado permanente primero                  | pendiente |
| V26 | `/admin/laboratorios`         | D/admin/laboratorios; LaboratoriosPage / LabTestToolbar       | U+C  | Datos/precio y acción sobre examen correcto; catálogo incorrecto                                 | pendiente |
| V27 | `/catalogo`                   | D/catalogo; CatalogoPage                                      | C    | Filtrado y precios recibidos, carga/error; información comercial engañosa                        | pendiente |
| V28 | `/mi-perfil`                  | D/mi-perfil; MiPerfilPage / hooks doctors-profile             | U+C  | Validación, guardar/verificar y estados; perfil incorrecto                                       | pendiente |
| V29 | `/admin/auditoria`            | D/admin/auditoria; AuditLogTable / useAuditLogs               | C    | Filtros, selección y errores diferenciados de vacío; ocultar evidencia                           | pendiente |

## Diferidas y auxiliares — 5

| ID  | URL                     | Fuente / componente objetivo                  | Prioridad / capa        | Justificación                                                                                                | Estado           |
| --- | ----------------------- | --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- |
| V30 | `/admin/roles`          | D/admin/roles; RolesPage                      | Baja / C opcional       | Expansión y permisos mostrados; NO prueba enforcement backend; reconsiderar si se agrega edición             | diferida         |
| V31 | `/admin/queues`         | D/admin/queues; QueuesPage                    | Baja / C opcional       | Indicadores de failed y acceso a Bull Board, sin polling propio; reconsiderar si se vuelve operación crítica | diferida         |
| V32 | `/`                     | A/page.tsx; RootPage                          | Auxiliar / E navegación | Sólo redirect('/inicio'); no unitarias duplicadas                                                            | sin-suite-propia |
| V33 | `/admin/especialidades` | D/admin/especialidades; LegacySpecialtiesPage | Auxiliar / E navegación | Sólo redirect('/especialidades'); no unitarias duplicadas                                                    | sin-suite-propia |
| V34 | `/tenant-not-found`     | A/tenant-not-found; TenantNotFoundPage        | Auxiliar / E contexto   | Pantalla estática; comprobar destino desde tenant inválido, no títulos/CSS                                   | sin-suite-propia |

## Qué NO cuenta como protección

Snapshots enormes, clases/iconos/títulos, detalles internos de hooks, mockear todo el árbol, duplicar formularios por ruta, o atribuir aislamiento tenant/idempotencia real a tests con API simulada. Probar DataTable compartida una vez y la configuración/acción propia de cada dominio.

**Progreso E007:** 28 recomendadas sin iniciar + V03 con C 2.1 verificada por ejecución, pendiente revisión independiente; dos diferidas, tres sin suite propia; cero rutas completamente verificadas. Suite `D/inicio/page.test.tsx`: diez casos C; ejecución en progress.md E007. Cobro 2.2, laboratorio y E2E no cubiertos. No se informa porcentaje de cobertura.

**Actualización E009:** V01 C implementada (14casos; R02/S02/S03,R07/S09; suite A/(auth)/login/login-form.test.tsx), pendiente revisión independiente. V03 C verificada E008;27recomendadas sin iniciar+2parciales. Cero rutas completas; server headers/cookies/E2E y V02 pendientes. Evidencia progress.md/E009.

**Corrección E011/V01:** E010 bloqueó falso positivo de reintento401. Ahora14C+1controlAPI/29globales verdes, login conserva contexto sin navegar; verificación independiente pendiente. No15casosC ni cobertura real cookie/server/E2E. V02 intacta.
