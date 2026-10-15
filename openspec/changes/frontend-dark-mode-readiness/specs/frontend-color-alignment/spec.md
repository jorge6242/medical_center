# Spec — frontend-color-alignment (fase 1)

## Registro de aceptación — 2026-10-15

Fase 1 aceptada; ver [acceptance.md](../../acceptance.md). Requisitos originales conservados debajo. El cierre combina verificación independiente y QA global declarada por usuario. La matriz visual granular de R05 y mediciones efectivas no tienen evidencia: excepción documental explícita, no cumplimiento por simulación. Limitación TDD DOM/E2E de R06 conservada como W02; lint previo W01 no corregido. Esta aceptación no certifica dark mode ni modifica su gate de validación futura.

## R01 — Cobertura completa y trazabilidad

La implementación MUST conservar los IDs FDM-H/R/C existentes y revisar todas las fuentes alcanzables del inventario. Edición y validación MUST registrarse por separado; fuentes nuevas MUST incorporarse.

### S01 — Revisión de un componente compartido

Given un componente usado por varias rutas, When se alinea su contrato, Then el seguimiento MUST referenciar los consumidores afectados sin afirmar que fueron renderizados por haber inspeccionado el componente.

## R02 — Contrato semántico de colores

Todo color de UI propia alcanzable MUST proceder de tokens definidos o excepción explícita. Success/warning MUST tener colores de contenido y contenedor emparejados; superficies y scrim MUST tener semántica documentada. El texto sobre cada superficie MUST usar su par compatible, incluidos hover y estados.

### S02 — Tokens faltantes y literales

Given los FDM-H002/H003 y paletas locales H004–H010, When corre el guard estático, Then MUST fallar ante referencias indefinidas o nuevos literales no exceptuados y MUST pasar tras corregirlos.

### S03 — Estados interactivos

Given botones, formularios, tablas, modal y dropdown, When se muestran normal, hover, foco, disabled, error, carga y vacío según corresponda, Then MUST mantener contrato de texto, fondo, borde e iconos coherente y foco perceptible.

## R03 — Integración y controles nativos

Sonner, inputs de auditoría, checkboxes, fechas, selects y textarea MUST seguir el contrato de pantalla claro actual. La fase 1 MUST NOT introducir preferencia de tema ni activar dark mode.

### S04 — Toasts y controles

Given success/error/info y controles nativos, When se muestran sus estados, Then MUST consumir tokens para sus partes controlables y MUST registrar los límites de estilos internos del navegador; un test de texto fuente MUST NOT presentarse como prueba del render del navegador.

## R04 — Documentos y excepciones

Impresión HTML MUST tener contrato documental explícito independiente de un tema futuro. PDFs MUST conservar su paleta documental. Logos MUST preservar identidad, verificando legibilidad. Bull Board, SVG sin uso y TSX no alcanzables MUST tener excepciones con motivo y límite, no borrarse incidentalmente.

### S05 — Salida impresa

Given una historia clínica con impresión HTML y PDF, When se imprime o genera el documento, Then MUST conservar texto legible sobre paleta documental clara y MUST registrarse comprobación separada de la UI.

## R05 — Evidencia y gate

El cierre MUST registrar revisión estática de 128 TSX/41 páginas (o inventario actualizado), pruebas automatizadas Docker y matriz visual por ruta/estado. Contraste de texto normal SHOULD alcanzar 4.5:1, texto grande 3:1 y controles/foco aplicables 3:1; excepciones MUST justificarse. Ningún estado no probado MAY marcarse validado.

### S06 — Cierre incompleto

Given validación visual o excepciones pendientes, When se evalúa cierre, Then fase 1 MUST permanecer abierta y fase 2 MUST continuar bloqueada.

### S07 — Separación de fases

Given autorización automática para limpieza, When se implementa fase 1, Then MUST NOT agregarse paleta oscura, selector, persistencia ni dependencia de tema.

## R06 — Strict TDD y seguridad de ejecución

Todo cambio comprobable automáticamente MUST comenzar con test que falle por el motivo esperado, seguido de implementación mínima y regresión. Tests, lint y typecheck MUST correr exclusivamente dentro de Docker; builds MUST NOT ejecutarse. Limitaciones visuales MUST registrarse sin fallback silencioso.

### S08 — Ciclo verificable

Given un defecto de contrato, When se implementa su corrección, Then evidencia MUST incluir comando y resultado RED/GREEN; ausencia de navegador o credenciales MUST registrarse como pendiente, no aprobación.
