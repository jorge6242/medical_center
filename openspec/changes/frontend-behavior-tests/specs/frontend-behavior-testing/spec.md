# Frontend Behavior Testing

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
