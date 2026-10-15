# Tasks — Fase 1 exclusivamente

Fase 1 completada y aceptada: verificación independiente y aceptación humana global en [acceptance.md](acceptance.md), con limitaciones explícitas. Modo automático y entrega única `exception-ok` autorizados por usuario (`size:exception`). Fase 2 lista para planificación, no implementada.

## Review Workload Forecast

| Field                                          | Value                                                 |
| ---------------------------------------------- | ----------------------------------------------------- |
| Estimated implementation + tests changed lines | 450–750 (estimación, no diff real)                    |
| Estimated planning documentation changed lines | 200–320 adicionales                                   |
| Evidence/checklist changed lines               | Variables; medir por slice                            |
| Total forecast                                 | 650–1.070 + evidencia                                 |
| Delivery strategy                              | exception-ok — entrega única autorizada               |
| Suggested split                                | Fundamentos → consumidores/integración → verificación |

Decision needed before apply: No — usuario autorizó `size:exception` el 2026-10-15.
Chained PRs recommended: Yes
400-line budget risk: High
Chain strategy: sin divisiones por pedido explícito del usuario; no crear PR/commit/branch.

Ningún slice puede ocultar tests/docs/lock del conteo. Si se autorizan cadenas: cada slice <400 líneas reales, autónomo, tests/docs junto al entregable. No abrir PR ni commit sin pedido. Si se aprueba excepción: registrar `size:exception` explícito antes de apply. Auto NO implica auto-chain.

## 1. Infraestructura y prerequisitos

- [x] 1.1 Persistir contexto SDD y detectar runner real Docker en design.md; sin ejecutar comandos de runtime.
- [x] 1.2 Formalizar spec fase 1 y mantener IDs; fase 2 bloqueada.
- [x] 1.3 Gate `size:exception` autorizado; Docker recuperado y servicios comprobados sin builds.
- [x] 1.4 Inventario AST 41 páginas/128 TSX, excepciones en inventory.md §9, 3 archivos nuevos `.mjs`; Safety Net 16/16.

## 2. Implementación por unidades (cada una RED → GREEN → REFACTOR)

- [x] 2.1 Tokens/superficies/scrim definidos; RED/GREEN y contraste opaco de pares nuevos registrados. Guard con fixtures negativas/positivas.
- [x] 2.2 Pares/scrim/elevación/foco implementados y aceptados globalmente por usuario; guard aprobado. Sin tests DOM, limitación W02 conservada.
- [x] 2.3 Paletas/hover corregidos; guard de 128 TSX aprobado y aceptación visual global reportada. Sin medición de contraste efectivo ni evidencia individual H016/H023.
- [x] 2.4 Contratos estáticos Sonner/nativos e inspección API/CSS instalada realizados; Input auditoría reutilizado, sin nuevas dependencias. QA de controles del SO sigue en 3.4.
- [x] 2.5 RED/GREEN de contrato print y ámbito documental; PDFs/logos preservados, excepciones delimitadas. Salidas reales pendientes en 3.4–3.5.

## 3. Testing y cierre

- [x] 3.1 Docker: suite nueva y cuatro existentes, 29/29; evidencia RED/GREEN en apply-progress.md.
- [x] 3.2 Typecheck aprobado; lint global falla deuda previa 6 errores/3 warnings; lint/formato dirigido aprobados. Sin builds.
- [x] 3.3 Reauditoría fuente y excepciones registradas; filas FDM-H/R/C separan actualizado de validado, sin aprobación visual.
- [x] 3.4 Cierre por aceptación visual humana global; excepción de trazabilidad granular: no hay matriz ejecutada por ruta/rol ni mediciones de contraste. Ver acceptance.md; no equivale a ejecutar el procedimiento original completo.
- [x] 3.5 Usuario confirma vistas y estados/notificaciones/nativos/impresión/PDF consultados; sin evidencia individual de Inicio/pagos ni operaciones atribuidas al agente. Ver acceptance.md.
- [x] 3.6 Informe independiente y addendum de cierre emitidos; fase 1 aceptada con W01/W02 conservados. Fase 2 lista para planificación.

## Fuera de alcance

No implementar FDM-H001 (tema oscuro), selector/persistencia ni reemplazo de framework. No borrar TSX/SVG antiguos. Ningún build.

## Fase 2 autorizada — 2026-10-15

Usuario solicita switch claro/oscuro, sin modo sistema; ejecución automática y entrega única size:exception. Fase 1 aceptada según acceptance.md.

Implementar preferencia por navegador (localStorage exclusivo para tema, nunca credenciales), fallback claro ante ausencia/error/valor inválido; cambiar html[data-theme] antes del primer paint mediante script estático sin datos del usuario. No se encontró CSP en frontend/compose; futura CSP deberá autorizar ese script por hash/nonce. Usar @theme no-inline para conservar referencias runtime de utilidades; mismos 31 roles claros y oscuros, color-scheme y elevación. Switch accesible en shell tenant/plataforma; Sonner consume theme. Impresión/PDF conservan paleta documental y logos no se recolorean. Sin dependencias, backend, builds ni commits.

- [x] P2.1 Tests RED de preferencia/inicialización y paleta; implementar GREEN.
- [x] P2.2 Contexto cliente mínimo, switch y shell; sin duplicar estado servidor.
- [x] P2.3 Ejecutar suites, typecheck/lint dirigido y registrar límites visuales.
- [ ] P2.4 Aceptación visual del tema oscuro separada; no heredar aceptación fase 1.
