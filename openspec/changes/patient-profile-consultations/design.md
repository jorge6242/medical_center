# Diseño

## Decisiones

1. Una URL con modo local lectura/edición. Desde listado, `Ver ficha` y acción de edición navegan a la ficha en lectura; editar exige un clic explícito allí. Se acepta ese clic para evitar query params/modos URL y mantener la página fina. Etiquetar la segunda acción `Abrir ficha para editar` para no prometer apertura directa del formulario.
2. `PatientProfile` cliente consume nuevo `usePatient(id)`; page servidor solo resuelve params y compone. Datos del servidor en TanStack Query; modo y borrador en RHF/estado local.
3. Reutilizar `PatientForm`, sus reglas y alta actual. Aislar lifecycle por paciente (`key` o montaje equivalente), precargar representante y no resetear un borrador por refetch. Cancelar vuelve al snapshot vigente del mismo paciente. Confirmación global de navegación no se incorpora: no prometer bloqueo del navegador; cubrir Cancelar y controles propios.
4. Secciones `Datos del paciente` y `Consultas`; no informes/antecedentes. Consultas se cargan con permiso independiente y muestran error/reintento propios. La ficha no agrega tabla de pagos ni columnas de importes.
5. GET consultas ya admite paciente/estado/paginación: extender `ConsultationQuery` y serialización frontend; conservar orden actual `createdAt DESC` por compatibilidad (no prometer cronología por fecha de visita). Se muestra fecha de visita; ordenar cronológicamente será mejora separada si se requiere.
6. Mantener GET/PATCH paciente. PATCH debe recargar representantes con el mismo include que GET para responder el estado completo. No cambiar semántica de creación/asociación de representantes ni borrado de opcionales.

## Contratos y límites

- `PatientResponse`: campos ya existentes; `representatives` se conserva al responder PATCH. No nuevos campos clínicos.
- `UpdatePatientDto` frontend: agregar `documentType`/`documentId` opcionales que backend ya valida; solo enviar campos pertinentes.
- `ConsultationQuery`: agregar `patientId?: string`; mantener page/limit/status/date.
- `usePatient(id)`: clave `['patients', id]`, habilitado con ID. Actualización ya invalida lista y detalle.
- Historial: clave `['consultations', {patientId,page,limit,status}]`; nunca reutilizar `usePatientConsultations` de medical-records.
- ACL: ficha `patients:read`, edición `patients:update`, historial `consultations:read`. Detalle de consulta conserva `patients:read` existente. Backend sigue autoridad real.
- PATCH con representante ausente conserva relaciones. Precargar primer vínculo para contrato singular actual; mostrar todos los demás en lectura, no ofrecer eliminación/reemplazo no soportados.
- Eliminar datos opcionales email/fecha/sexo no se incorpora; explicar preservación al vaciar para no simular borrado.

## Backend y base de datos

`PatientsService.update` debe incluir representantes al recargar respuesta. Conservar `where:{id,tenantId}` y auditoría existente. No extender payload con consultas ilimitadas ni duplicar endpoint. Relaciones Patient/Consultation e índice `(tenantId,patientId)` existen: ninguna migración ni tabla nueva necesaria. Servicios/especialidades son snapshots; nombres de doctor/paciente son valores actuales, no reconstrucción histórica inmutable.

## Afectados

- Web: page pacientes y detalle, columnas, PatientForm, hook/service patients; nuevo panel de ficha e historial y sus tests/fixtures.
- API: recarga de respuesta `PatientsService.update` y tests locales.
- No tocar el OpenSpec `frontend-behavior-tests`, medical-records ni endpoints de borrado.

## Verificación y límites

STRICT TDD: test de comportamiento falla antes de cambio productivo, luego mínimo GREEN. Datos fixture separados de mocks/handlers; aislamiento del harness existente. Docker solamente; no builds. Gates: tests focalizados por unidad, typecheck y lint de tocados; suite web completa + suite patients API al cierre. No equivalen a E2E ni garantizan cero regresiones. Si los guides Next versionados no están disponibles al implementar, reportar y resolver acceso antes de escribir código dependiente de sus APIs.
