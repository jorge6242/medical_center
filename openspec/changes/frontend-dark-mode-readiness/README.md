# Dark mode: fase 2 implementada, pendiente de aceptación visual

**Estado vigente (2026-10-15):** fase 1 aceptada. Fase 2 implementa switch claro/oscuro en shell tenant/plataforma, preferencia por navegador, paleta runtime, Sonner/nativos y aislamiento documental. **39/39 tests**, typecheck/lint dirigido aprobados. Falta validación visual autenticada y aceptación propia. Ver [evidencia](apply-progress.md), [spec fase 2](specs/frontend-dark-theme/spec.md) y [aceptación](acceptance.md).

Nuevo inventario: **129 TSX alcanzables**, 41 páginas, **31 tokens de color por tema** (corrige conteo histórico33). No builds, dependencias, backend ni commits.

## Línea base y registro histórico fase 1

# Dark mode: fase 1 aceptada; fase 2 lista para planificación

**Estado vigente (2026-10-15):** fase 1 completada con verificación independiente y aceptación visual global declarada por el usuario. Ver [aceptación y límites](acceptance.md). Fase 2 no implementada; falta decidir comportamiento del tema. Los registros históricos inferiores conservan la evidencia original, sustituida en estado por esta aceptación.

**Hay una base de design system; todavía no hay dark mode.** Este registro conserva el diagnóstico del frontend completo para que no se pierda el contexto entre sesiones. El diagnóstico se conserva íntegro; proposal, spec, design y tasks formalizan ahora únicamente la fase 1.

Fecha de línea base: **2026-10-15**. Alcance implementado: **fase 1 de limpieza y alineamiento, modo automático, entrega única `size:exception`**. Ver [evidencia y continuidad](apply-progress.md) y [aceptación manual](acceptance.md).

## Lectura rápida

1. [Inventario íntegro](inventory.md): evidencia, riesgos, 41 páginas y 128 archivos TSX alcanzables.
2. [Seguimiento](checklist.md): hallazgos, rutas y componentes con IDs estables; edición y validación visual separadas.
3. [Estado recuperable](state.yaml): autorización y límites de este registro.
4. [Propuesta](proposal.md), [spec fase 1](specs/frontend-color-alignment/spec.md), [diseño y contexto SDD](design.md), [tareas y forecast](tasks.md).

| Dimensión                     | Estado                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Inspección de código          | Completada para la línea base estática descrita en el inventario                                    |
| Documentación                 | Diagnóstico y planificación fase 1 persistidos en este directorio                                   |
| Código actualizado            | 15 TSX y CSS global; 3 herramientas/tests `.mjs` nuevos                                             |
| Dark mode implementado        | No                                                                                                  |
| Validación visual / contraste | Aceptación global declarada por usuario; sin evidencia granular ni mediciones de contraste efectivo |
| Builds / tests                | Ningún build; 29 tests aprobados (16 existentes + 13 contratos estáticos/analizador)                |

## Cobertura

230 fuentes .ts/.tsx/.css; 130 TSX; 41 páginas; 47 entradas App Router incluyendo layouts y estados especiales. Grafo de imports locales: 224 fuentes y **128 TSX alcanzables**. Los dos TSX antiguos de Sidebar/Topbar fuera de ui/ no tienen imports encontrados desde las entradas inspeccionadas.

Los conteos son un inventario de archivos y dependencias, **no cobertura de tests ni garantía de renderizado de todas las ramas, permisos o estados**.

## Qué quedó registrado

- Tokens claros y componentes reutilizables existentes; ausencia de mecanismo y paleta de tema oscuro.
- Cuatro tokens consumidos sin definición local.
- Colores directos, pares semánticos, herencia y estados interactivos pendientes.
- Toasts, controles nativos, overlays, logos, impresión HTML, PDFs y Bull Board externo.
- Inventario completo de rutas y componentes, sin confundir dependencias compartidas con problemas exclusivos de una vista.

## Decisiones pendientes

- Alcance de producto: solo oscuro fijo o selector claro/oscuro/sistema; persistencia y ámbito de preferencia.
- Paleta y contrato de tokens aprobados, incluidos estados, scrim y elevación.
- Política explícita para PDFs, impresión HTML, identidad de marca y UI externa.
- Criterios de validación visual/accesibilidad y estados necesarios por componente.

El usuario pidió explícitamente este orden:

## Fases requeridas y gate

| Fase                           | Objetivo                                                                                                                                                                 | Estado                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **1. Limpieza y alineamiento** | Alinear TODOS los componentes alcanzables con tokens de color y el design system existente; definir tokens faltantes con semántica y registrar excepciones justificadas. | Completada y aceptada; límites W01/W02 y evidencia granular documentados |
| **2. Tema del design system**  | Definir y aplicar el tema oscuro sobre la base ya alineada; resolver las decisiones de paleta y comportamiento antes de implementarlas.                                  | Lista para planificación; no implementada                                |

**Gate obligatorio:** la fase 2 NO inicia hasta que la fase 1 esté auditada y cerrada: UI alineada, tokens faltantes definidos con semántica, excepciones documentadas y validaciones registradas. No basta con cambiar fondos ni cerrar casillas por edición de archivos.

- **Aceptación estática fase 1:** usos de color y tokens revisados en todos los archivos/rutas inventariados; sin tokens indefinidos; fugas corregidas o excepciones explícitas; pares y estados documentados.
- **Aceptación visual fase 1:** aprobación global declarada por usuario, registrada en acceptance.md; no certifica mediciones ni ejecución individual de la matriz.
- **Aceptación fase 2:** tema aplicado al design system y validación visual/contraste/regresión en todas las áreas; actualmente **no iniciada**. La validación del tema oscuro no puede darse por hecha en fase 1.

La fase 1 usa el runner Node existente; no se eligieron paleta oscura ni selector. El usuario resolvió el gate de tamaño con entrega única `exception-ok`. Esa decisión de entrega no resuelve el comportamiento ni la implementación de fase 2.

## Convenciones y límites

Se leyó `openspec/config.yaml` y el cambio representativo `openspec/changes/frontend-behavior-tests/`. Se reutilizan documentos Markdown, inventario trazable y estado YAML sin simular etapas SDD que no se ejecutaron.

Las referencias internas son repo-relativas para portabilidad; las líneas del inventario son la línea base, no posiciones posteriores a las ediciones. Se inspeccionaron API/CSS reales de Sonner en el contenedor. No hay evidencia granular de matriz visual/recursos remotos; la aprobación global y esa limitación quedan separadas en acceptance.md.
