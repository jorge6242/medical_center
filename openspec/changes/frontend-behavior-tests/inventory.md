# Inventario trazable de vistas

**34 rutas; ninguna prueba frontend implementada por este cambio.** 15 altas + 14 medias = 29 recomendadas; 2 bajas diferidas; 3 auxiliares sin suite propia. No son 34 suites ni una medición de cobertura.

## Lectura y seguimiento

Fuente abreviada: `D/` = `apps/web/src/app/(dashboard)/`; `A/` = `apps/web/src/app/`. Cada ruta indicada bajo D/A tiene archivo `page.tsx`. Componentes nombrados están importados por esa fuente (o definidos allí); no suponen suites separadas.

- **U**: unitaria para validaciones/transformaciones propias, si existen; no replicar cálculos de API.
- **C**: componente/integración con interacciones y límites HTTP controlados; incluye hooks/services relevantes.
- **E**: E2E complementaria para navegación/contexto o flujo real; no una E2E obligatoria por fila.
- `pendiente`: cobertura futura recomendada; `diferida`: baja prioridad fuera del primer alcance; `sin-suite-propia`: wrapper auxiliar sin comportamiento que justifique unitaria.
- Para avanzar una fila registrar escenarios, tarea, archivo de test, comando Docker, fecha y resultado. No marcar `verificada` por existencia del archivo ni por test de backend. Las suites compartidas pueden referenciar varios IDs.

## Prioridad alta — 15

| ID  | URL                             | Fuente / componente objetivo                                           | Capa  | Comportamiento útil / riesgo                                                                              | Estado    |
| --- | ------------------------------- | ---------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- | --------- |
| V01 | `/login`                        | A/(auth)/login; `login-form.tsx` / LoginForm                           | U+C+E | Validación, errores y contexto slug correcto; sesión en centro equivocado                                 | pendiente |
| V02 | `/onboarding`                   | A/onboarding; OnboardingPage                                           | U+C+E | Contraseñas coincidentes, token ausente/servicio rechazado; activación inválida                           | pendiente |
| V03 | `/inicio`                       | D/inicio; InicioPage / SpecialtyConsultation / ConsultationPaymentForm | C+E   | KPIs con fixtures conocidas, carga/error, selección especialidad-doctor; demo engañosa o cobro equivocado | pendiente |
| V04 | `/agenda`                       | D/agenda; ScheduleConsultationForm / ConsultationPaymentForm           | U+C+E | Fechas, acciones por estado, consulta seleccionada; turno/cobro incorrecto                                | pendiente |
| V05 | `/pagos`                        | D/pagos; PaymentForm / acciones de tabla / recibo                      | U+C+E | Validación, ajustes, anular y recibo del pago seleccionado; daño financiero                               | pendiente |
| V06 | `/laboratorio/ordenes`          | D/laboratorio/ordenes; LabOrderForm / LabPaymentForm                   | U+C+E | Crear y cobrar orden seleccionada, estados pendientes/error; cobro incorrecto                             | pendiente |
| V07 | `/egresos`                      | D/egresos; ExpenseForm / confirmación anulación                        | U+C+E | Datos válidos, motivo vacío impide mutación, ID correcto; egreso/anulación accidental                     | pendiente |
| V08 | `/liquidaciones-doctores`       | D/liquidaciones-doctores; DoctorPayoutsPage                            | C+E   | Listado, enlace al detalle y anulación según estado/motivo; liquidación equivocada                        | pendiente |
| V09 | `/liquidaciones-doctores/nueva` | D/liquidaciones-doctores/nueva; DoctorPayoutForm                       | U+C+E | Consultas seleccionadas e importes presentados/enviados; honorarios incorrectos                           | pendiente |
| V10 | `/liquidaciones-doctores/[id]`  | D/liquidaciones-doctores/[id]; DoctorPayoutDetailPanel                 | C+E   | Detalle/recibo del ID solicitado, error/no encontrado; documento equivocado                               | pendiente |
| V11 | `/reportes`                     | D/reportes; ReportesPage / hooks / exportación                         | U+C+E | Filtros/pestañas y dataset enviado a exportar; informe incorrecto                                         | pendiente |
| V12 | `/admin/usuarios`               | D/admin/usuarios; UsuariosPage / UserForm / UserEditForm               | C+E   | Usuario seleccionado, roles asignables y desactivación; acceso erróneo                                    | pendiente |
| V13 | `/admin/usuarios/nuevo`         | D/admin/usuarios/nuevo; UserForm importado de ../page                  | U+C   | Validación y rol enviado; cuenta inválida; suite compartida V12                                           | pendiente |
| V14 | `/admin/usuarios/[id]/editar`   | D/admin/usuarios/[id]/editar; UserEditForm importado de ../../page     | U+C+E | Usuario resuelto por ID y datos enviados; editar cuenta ajena; suite compartida V12                       | pendiente |
| V15 | `/admin/configuracion-centro`   | D/admin/configuracion-centro; TenantSettingsForm                       | U+C   | Validación y payload guardado; configuración incorrecta                                                   | pendiente |

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

**Línea base de progreso:** 29 pendientes, 2 diferidas, 3 sin suite propia; 0 rutas verificadas por este cambio. No se informó porcentaje de cobertura porque no se ejecutó un runner.
