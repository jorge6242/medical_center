# Patient profile — requisitos delta

## ADDED Requirements

### Requirement: Ficha única y acceso

La aplicación MUST presentar `/pacientes/[id]` en lectura, con nombre, identificación, contacto, nacimiento, sexo, estado y representantes disponibles. MUST NOT montar informes/antecedentes ni solicitar sus endpoints desde esta pantalla. El GET existente incluye `clinicalHistory`; omitirlo de la UI, no cambiar ese contrato global.

#### Scenario: Lectura correcta

- GIVEN un paciente activo accesible en su tenant
- WHEN se abre su ficha
- THEN se muestran sus datos y representantes sin campos editables por defecto ni llamadas de informes.

#### Scenario: Lectura no disponible

- GIVEN una respuesta 404, 403 o error de red
- WHEN se abre la ficha
- THEN se distingue no encontrado, acceso denegado o carga fallida; no se fabrica un paciente vacío y se ofrece reintento cuando corresponde.

### Requirement: Edición explícita y segura

La UI MUST permitir editar únicamente con `patients:update`, reutilizar la validación existente y enviar PATCH al ID cargado. MUST conservar datos no enviados, bloquear envíos duplicados y Cancelar durante envío, y no sobrescribir cambios locales con refetch. MUST NOT ampliar permisos backend.

#### Scenario: Guardar o cancelar

- GIVEN una ficha cargada y permiso de actualización
- WHEN se guardan datos válidos
- THEN se actualizan ficha/lista; representantes siguen presentes y se vuelve a lectura después del éxito.
- WHEN se cancela antes del envío
- THEN se descartan cambios locales sin PATCH.

#### Scenario: Error y operación pendiente

- GIVEN edición con cambios
- WHEN PATCH falla o continúa pendiente
- THEN el error conserva valores para reintentar; mientras está pendiente no se duplica ni se descarta la operación desde controles locales.

#### Scenario: Cambio de paciente

- GIVEN la ficha A con una petición pendiente
- WHEN la navegación monta la ficha B
- THEN respuestas tardías de A no reemplazan datos ni edición de B; cada consulta usa ID en su clave.

### Requirement: Contratos de documento y representante

La edición MUST precargar el representante existente y mostrar todos los vínculos disponibles en lectura. MUST conservar el contrato singular/aditivo de representante existente, sin prometer reemplazo/eliminación ni edición de datos compartidos de otro representante. MUST tipar documento y evitar casts que escondan campos faltantes.

#### Scenario: Menor y documento

- GIVEN un menor y/o representante registrado
- WHEN se abre la edición
- THEN se precargan sus datos; omitir representante no elimina vínculos y el código automático del menor no se regenera.
- WHEN se promueve a documento no M
- THEN se envían tipo y número válidos juntos conforme al backend actual.

#### Scenario: Opcionales

- GIVEN email, nacimiento o sexo persistidos
- WHEN un control opcional queda vacío
- THEN se preserva el valor conforme al contrato actual y la UI informa que vaciarlo no lo elimina; no se promete borrado. Teléfono mantiene su semántica existente de cadena vacía.

### Requirement: Historial real y paginado

El historial MUST usar GET `/consultations` con `patientId`, página y límite; sin estado por defecto para incluir SCHEDULED/PENDING/PAID/VOIDED. MUST exigir `consultations:read`, mostrar fecha, doctor actual, servicios/especialidades snapshot y estado; SHOULD usar `attendedAt` cuando informe atención. MUST NOT interpretar PAID como atendida ni agregar información financiera a la nueva tabla.

#### Scenario: Navegación del historial

- GIVEN consultas del paciente en distintos estados
- WHEN se consulta una página o cambia un filtro de estado
- THEN se conserva `patientId`, se reinicia página al cambiar filtro y se enlaza `/consultas/{id}` con la consulta correcta.

#### Scenario: Sin permiso, vacío o error

- GIVEN ausencia de permiso de consultas, cero resultados o fallo de API
- WHEN se abre el panel
- THEN no se solicita historial sin permiso; vacío y error son estados diferentes, independientes de los datos personales.

### Requirement: Seguridad y compatibilidad

Toda consulta MUST mantener tenant; el PATCH MUST validar pertenencia. MUST mantenerse el 404 actual para pacientes inactivos, el GET `/patients/:id/consultations` de PAID sin informe, snapshots y endpoints clínicos existentes.

#### Scenario: Tenant y persistencia

- GIVEN un ID de otro tenant o paciente con historia clínica/financiera existente
- WHEN se solicita su ficha o se actualizan datos personales permitidos
- THEN no se exponen datos ajenos ni se modifican consultas, pagos, snapshots o antecedentes omitidos.
