# Frontend Behavior Testing

## E046 — V10-B

Generador MUST recibir snapshot del ID/filename correctos;PDF rechazado MUST mostrar error,sin descargar,y permitir reintento. Cambio payoutId/unmount MUST descartar success/catch/finally viejos sin liberar pending nuevo. Refetch del mismo ID MUST conservar guard de exportación iniciada desde snapshot válido;errores siguen bloqueando nuevos exports. No contenido/layout PDFreal/E2E/backend financiero acreditados.

## E044 — V10-A

Detalle MUST mostrar snapshot del ID solicitado,incluso VOIDED;loading/404/503/null/IDajeno MUST distinguirse. Error con caché MUST NOT presentar éxito ni descarga;refetch MUST bloquear descarga y recuperación restaurar detalle. HTTP tardío de A MUST NOT reemplazar B. Sin wrapper async/PDF real/E2E/backend financiero acreditados.

## E042 — V09-B2

Preview MUST recibir selección/snapshot actuales y flag borrador;datos inválidos/catálogos fallidos MUST bloquear. PDF fallido MUST mostrar error y permitir nuevo intento. Cambio de contexto/unmount MUST invalidar resultado anterior,success/catch/finally sin afectar preview nuevo pendiente. Frontera del generador,no PDF real/layout/E2E.

## E040 — V09-B1

POST pendiente MUST conservar contexto/selección aun ante refetch vacío/error y bloquear campos/Cancelar/segundo envío. Rechazo MUST explicitar error/identidad y permitir segundo HTTP válido;catálogo fallido MUST bloquear reintento hasta recuperación. Éxito MUST navegar al ID recibido e invalidar cachés existentes de listado/pendientes. No guard de navegador global ni idempotencia backend/PDF/E2E acreditados.

## E038 — V09-A2

Catálogos MUST distinguir carga/vacío/fallo fresco/cacheado y bloquear POST durante fetch/error o sin doctor/pagos. BCV MUST cumplir DTO≥0.0001/máximo4decimales incluso USD;PagoMóvil exige referencia no blanca según service. Error lookup MUST NOT aparentar Sin resultados;recuperación restaura selector. Sin nuevas políticas financieras/B/E2E.

## E036 — V09-A1

Lookup MUST enviar q/limit/cursor;POST MUST usar doctor/paymentIds elegidos. Refetch mismo doctor MUST conservar intersección válida sin reactivar deseleccionados/agregar nuevos;otro doctor MUST limpiar selección previa aun con IDs solapados/caché. A2/B/E2E pendientes,sin cálculo financiero autoritativo nuevo.

## E034 — V08 listado/anulación

Listado MUST distinguir carga/vacío/error fresco o cacheado;enlace MUST usar ID de fila y solo COMPLETED ofrece anular. Prompt cancelado MUST NOT enviar;motivo trim≥3 según DTO existente. POST pendiente MUST bloquear otras anulaciones;fallo explícito permite segundoHTTP ID/motivo correctos y éxito refetchea filaVOIDED. Sin nueva UI modal/filtros ni backend financiero/E2E.

## Purpose

Planificación, no ejecución. IDs/rutas: `../../inventory.md`. Escenarios sobre comportamiento existente, sin UI nueva.

## ADDED Requirements

### Requirement: R01 — Infraestructura y capas

MUST habilitar runner web antes de suites, usar Docker sin builds y TDD RED→GREEN→REFACTOR. Unitarias: lógica propia; componentes/integración: interacción; E2E: navegador/API reales. Mocks/fixtures MUST separarse. Tests API MUST NOT acreditar cobertura UI/aislamiento tenant.

#### Scenario: S01 — Preparación

- GIVEN web sin runner
- WHEN comienza implementación autorizada
- THEN infraestructura queda verificada en Docker con evidencia TDD.

### Requirement: R02 — Acceso (V01–V02)

La cobertura MUST comprobar contexto de centro, validación y rechazo de acceso/activación.

#### Scenario: S02 — Acceso válido

- GIVEN centro resuelto y datos válidos
- WHEN se envía login o activación
- THEN se envía contexto/payload correcto y se muestra el resultado acordado.

#### Scenario: S03 — Acceso inválido

- GIVEN token ausente, contraseñas distintas o servicio rechazado
- WHEN se intenta continuar
- THEN no se presenta éxito y validación inválida impide mutación.

### Requirement: R03 — Inicio y agenda (V03–V04)

La cobertura MUST verificar KPIs recibidos, dependencia especialidad-doctor, fechas y acciones por estado.

#### Scenario: S04 — Selección operativa

- GIVEN KPIs conocidos y doctor seleccionado
- WHEN cambia especialidad o se selecciona turno
- THEN los KPIs coinciden, se limpia doctor incompatible y acciones/payload corresponden al turno y estado.

### Requirement: R04 — Operaciones financieras (V05–V10)

La cobertura MUST verificar formularios, ajustes, selección de orden/consulta/pago/liquidación, importes recibidos y recibos; MUST NOT recalcular reglas autoritativas API.

#### Scenario: S05 — Operación válida

- GIVEN selección y datos válidos
- WHEN se crea, cobra, ajusta o solicita recibo
- THEN payload/documento corresponden al ID seleccionado e importes confirmados.

#### Scenario: S06 — Anulación inválida

- GIVEN egreso/liquidación con motivo vacío
- WHEN se confirma anulación
- THEN no se dispara mutación; errores del servicio no muestran éxito.

### Requirement: R05 — Gestión (V12–V16, V21–V26, V28)

MUST cubrir validación, precarga, roles asignables, precios/split, selección y acciones por estado. Formularios compartidos SHALL probarse una vez con trazabilidad múltiple.

#### Scenario: S07 — Guardado

- GIVEN entidad seleccionada y contrato confirmado
- WHEN se modifica información válida o inválida
- THEN se envía ID/payload correcto sólo si es válida; precarga y acciones reflejan estado recibido.

### Requirement: R06 — Lecturas clínicas y analíticas (V11, V17–V20, V27, V29)

MUST comprobar filtros, selección, detalle/historial y datos de exportación/descarga.

#### Scenario: S08 — Lectura contextual

- GIVEN dataset conocido
- WHEN se filtra, selecciona detalle o exporta
- THEN parámetros, registros/documento pertenecen al contexto solicitado.

### Requirement: R07 — Estados transversales (V01–V29)

Las suites MUST distinguir carga, vacío, error y no-encontrado donde correspondan.

#### Scenario: S09 — Fallo

- GIVEN servicio pendiente, vacío, fallido o ID inexistente
- WHEN se renderiza
- THEN cada estado observable se distingue sin éxito/datos ficticios.

### Requirement: R08 — Alcance honesto (V30–V34)

V30–V31 SHALL permanecer diferidas; V32–V34 sin suite propia: redirecciones/pantalla estática. E2E futura MUST separar costos de navegador, datos y servicios. MUST NOT exigir 100%, snapshots masivos, CSS/títulos ni duplicar wrappers.

#### Scenario: S10 — Priorización

- GIVEN 34 rutas
- WHEN se informa cobertura
- THEN distingue 29 recomendadas, dos diferidas y tres auxiliares; navegación puede verificarse por E2E.

### Requirement: R09 — Contratos pendientes

V25 y V18–V19 MUST validar borrado permanente y contratos históricos antes de aprobar expectativas.

#### Scenario: S11 — Contradicción

- GIVEN documentación/código discrepantes
- WHEN se prepara test
- THEN se registra bloqueo y decisión pendiente, sin aprobar borrado físico ni inventar endpoint.

### Requirement: R10 — Progreso verificable

Cada avance MUST registrar tarea, escenario, V-ID, fuente, suite/archivo, comando Docker, resultado, fecha y estado. Fallos/bloqueos MUST conservarse; planificación MUST NOT contarse como ejecución.

#### Scenario: S12 — Cierre

- GIVEN tarea con archivo pero sin ejecución reproducible
- WHEN se actualiza progreso
- THEN no queda verificada; sólo evidencia exitosa de todos sus escenarios permite cierre.

### Aclaración aceptada E007 — V03/R07, solo tarea 2.1

- GIVEN fallo HTTP en resumen, especialidades o doctores (incluida actualización del resumen con datos previos)
- WHEN termina la petición fallida
- THEN MUST mostrar error explícito role=alert; resumen sin KPIs/alertas exitosas ficticias, especialidades sin «no coincidencias», doctores sin «no activos» ni servicios previos como éxito.
- WHEN cambia a una especialidad cuya petición resulta válida
- THEN desaparece error de doctores y se muestran servicios/precios del doctor seleccionado. Acciones rápidas permanecen disponibles. Cobro/laboratorio/E2E no pertenecen a2.1.

### Aclaración E009 — V01/R02 y R07, solo 3.1.1

Login MUST priorizar access no vacío; sin access utilizable usa webSlug. Sin contexto MUST impedir login sin carga ficticia. Rechazo MUST mostrar alerta sin autenticar; éxito envía email/password/contextToken. Redirect MUST ser ruta local sin host/protocolo, barra doble inicial, backslash ni controles/espacios; caso inseguro usa /inicio. Wrapper server, cookie HttpOnly y E2E quedan pendientes.

**Aclaración E011/S03:** login401 MUST conservar contexto y formulario sin redirección global, permitiendo reintento. La sesión expirada en endpoints protegidos MUST mantener redirección previa. Opción de comportamiento del cliente MUST NOT enviarse a fetch como RequestInit extra.

## E013 — Alcance V04 dividido aprobado

S04/S09 para Agenda MUST verificar acciones SCHEDULED/PENDING/PAID/VOIDED e ID seleccionado; filtros fecha/estado reinician paginación. Carga, vacío válido y error se distinguen. Edición convierte Caracas→UTC, excluye consulta actual al consultar disponibilidad y bloquea conflicto/error incluso con caché. Mutaciones pendientes bloquean doble envío; fallo visible no simula éxito y permite reintento. Bloque A acredita página; bloque B pendiente acredita formulario real de creación. Cobro interno2.2/E2E excluidos.

## E015 — V04-B: creación real

El formulario MUST exigir paciente, doctor, servicios y fecha/hora; cambiar doctor MUST limpiar servicios previos. MUST enviar IDs seleccionados, intervalo Caracas→UTC/duración y preferencia de notificación; pago inmediato solo entrega consulta al callback, sin acreditar cobro. Disponibilidad pendiente/conflictiva/fallida (también cacheada) MUST bloquear creación y mostrar el fallo. POST pendiente MUST impedir doble envío; rechazo conserva formulario sin éxito y reintento MUST enviar otra petición y devolver la consulta recibida.

## E019 — V05-B PaymentForm, tarea2.3.2

Cambio de doctor MUST limpiar IDs de servicios anteriores; carga/error de catálogos MUST impedir envío y no fingir vacío válido, aun con caché. Fecha/IDs/líneas elegidas MUST corresponder al payload; inválidos no envían POST. Durante POST MUST conservar formulario/contexto e impedir cierre Cancelar/Escape y doble envío; rechazo explícito permite segundo HTTP y éxito cierra/invalida caché. Sin afirmar idempotencia backend, PDF, ConsultationPaymentForm2.2 ni E2E.

## E021 — V05-C recibos, tarea2.3.3

HTTP y generador MUST recibir el ID/snapshot seleccionado, sin reconstruir datos vivos. Carga/fallo HTTP/PDF MUST distinguirse sin abrir ventana tras fallo; reintento exitoso vuelve a generar documento correcto. Respuestas de selección anterior MUST NOT reemplazar la actual. Acredita HTML y frontera del generador, NO contenido/layout del PDF real ni E2E.

## E024 — V06-A listado/detalle, tarea3.3.1

Listado MUST distinguir carga/vacío/error, también con caché previa; búsqueda/estado reinician página. Solo filas PENDING ofrecen pagar. El detalle MUST pertenecer al ID seleccionado y seguir PENDING; carga/refetch/error bloquean formulario, sin éxito cacheado engañoso. Fallo visible MUST permitir nuevo HTTP del mismo ID. Formularios de creación/cobro son fronteras B/C aún no acreditadas;sin E2E ni PDF.

## E026 — V06-B alta real, tarea3.3.2

Alta MUST enviar paciente/tests finales, sin tests removidos;sin paciente/tests no envía. Catálogos pendientes/fallidos MUST distinguir vacío válido y bloquear envío aun con caché. POST pendiente MUST conservar modal ante Cancelar/Escape y prevenir doble alta;rechazo visible permite segundo HTTP con mismos datos. Éxito cierra sin callback demorado que afecte la siguiente alta. Catálogos actuales son GET /patients y /catalog/laboratories sin lookup q/limit;no inventar búsquedas/cantidades ni PDF.

## E028 — V06-C cobro real, tarea3.3.3

Formulario MUST enviar paciente/ordenLAB seleccionados,BCV/líneas/método/moneda/importe y UUID;datos inválidos no envían. POST pendiente MUST proteger formulario/contexto ante Cancelar/Escape,selección de otra fila y refetch del detalle(incluso PAID/error),sin reset ni segundo cobro. Rechazo visible conserva datos y permite segundo HTTP;éxito cierra e invalida listado visible. Frontera componente,no idempotencia financiera backend ni PDF/E2E;no campo referencia inexistente.

## E030 — V07-A listado/detalle/anulación, tarea3.4.1

Listado MUST distinguir carga/vacío/error incluso cacheado; búsqueda reinicia página. Detalle MUST mostrar snapshot seleccionado;solo ACTIVE ofrece anular. Motivo trim MUST tener al menos5 caracteres(contrato API confirmado y alineación frontend autorizada);sin motivo no POST. Pendiente MUST impedir cierre/cambio de egreso/doble envío. Fallo conserva contexto/motivo y muestra error;reintento envía nuevo HTTP del ID/motivo actual y éxito cierra/refresca filaVOIDED. Error de selección previa MUST NOT contaminar otra. ExpenseForm es frontera B,no E2E/backend financiero.

## E032 — V07-B alta real, tarea3.4.2

Formulario MUST enviar categoría elegida/descripción2–200,USDpositivo/Bsopcionalpositivo máximo2decimales según DTO existente. Bs vacío MUST omitirse,no NaN/null;datos inválidos no envían. Catálogo pendiente/error(cacheado incluido)/vacío MUST distinguirse y bloquear alta. POST pendiente MUST conservar contexto e impedir cierre/doble envío;rechazo visible permite segundoHTTP,éxito cierra y nueva fila aparece por refetch. Reabrir MUST mostrar formulario limpio sin error anterior. No fechas/método/tasa/referencia inventados ni backend financiero/E2E acreditados.
