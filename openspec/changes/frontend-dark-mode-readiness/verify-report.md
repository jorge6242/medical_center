# Verificación independiente — fase 1

## Addendum de cierre — 2026-10-15

**Estado vigente: fase 1 completada y aceptada; fase 2 lista para planificación, no implementada.** El usuario confirmó revisión global satisfactoria tras consultar explícitamente estados, notificaciones, controles nativos e impresión/PDF. [acceptance.md](acceptance.md) registra procedencia y límites. **C01 cerrado por aceptación manual reportada**, no por tests DOM ni renders observados por el agente. No quedan defectos estructurales abiertos de esta revisión. W01/W02 continúan sin corregir como límites documentados de cierre; S01 queda sugerida. La falta de matriz granular/mediciones es excepción de cierre, no cumplimiento automatizado. No archivar el cambio completo: fase 2 pendiente.

El informe original se conserva a continuación como evidencia histórica: su veredicto y matriz describen el momento anterior a esa aceptación y no se reescriben retroactivamente.

**Cambio:** frontend-dark-mode-readiness · **Fecha:** 2026-10-15 · **Modo:** Strict TDD · **Backend:** OpenSpec físico.

**Veredicto: PARCIAL / NO ARCHIVAR.** Implementación estática corregida y checks ejecutados: **29/29 tests**, typecheck y lint dirigido aprobados. **1 CRITICAL, 2 WARNING, 1 SUGGESTION** pendientes. El CRITICAL es un gate de aceptación sin evidencia, no un defecto visual confirmado. Fase 2 continúa bloqueada.

## Alcance y completitud

Se leyeron proposal, spec R01–R06/S01–S08, design, tasks, apply-progress, inventory y checklist; se revisó el diff completo de los 16 archivos existentes modificados y los 3 archivos `.mjs` nuevos. El guard ejecutado confirma 41 páginas y 128 TSX alcanzables; no prueba render ni todas sus ramas.

| Métrica de tasks.md al verificar | Resultado                  |
| -------------------------------- | -------------------------- |
| Tareas totales                   | 15                         |
| Completas                        | 10                         |
| Abiertas                         | 5: 2.2, 2.3, 3.4, 3.5, 3.6 |

Las casillas abiertas son coherentes con el código: 2.2/2.3 están implementadas pero sin aceptación de comportamiento/visual; 3.4/3.5 requieren navegador y documentos reales; 3.6 exige cierre estático **y** visual. Este informe satisface su parte de reporte, no habilita cerrar la tarea entera. No se modificaron tasks ni fuentes desde verify.

## Ejecución independiente

Todos los comandos de runtime se ejecutaron dentro del contenedor `web`, con `cd /app/apps/web`, mediante `docker compose -f docker-compose.dev.yml exec -T web sh -lc '…'`. **Builds: 0.** Sin instalación, cambios de datos, backend, commits o PRs.

| Comando / comprobación                                                                                                    | Resultado                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node --test --experimental-test-coverage src/shared/design-system/*.test.mjs src/features/platform-shared/*.test.mjs`    | Exit 0: 29 passed, 0 failed, 0 skipped; 13 nuevos de contrato/analizador + 16 existentes         |
| `pnpm run typecheck`                                                                                                      | Exit 0                                                                                           |
| `pnpm run lint`                                                                                                           | Exit 1: 6 errores, 3 warnings preexistentes                                                      |
| ESLint dirigido a los 3 `.mjs` y todos los TSX modificados salvo lab-payment-form                                         | Exit 0, `--max-warnings 0`                                                                       |
| HEAD original de lab-payment-form por `git show HEAD:…` canalizado a ESLint `--stdin --stdin-filename …` dentro de Docker | Reproduce error `3:10 useState` del archivo modificado: deuda comprobada, no atribuida al cambio |
| `git diff --check`                                                                                                        | Exit 0                                                                                           |
| CSS dev ya existente en `.next/dev/static/chunks/apps_web_src_app_globals_10btyws.css`                                    | Inspeccionado sin build: confirma literales de `@theme inline` y regla print explícita nueva     |

Lint previo restante: report-excel (3 errores), report-export-sidebar (1), use-reports (1 error/1 warning), medical-record-dynamic-form (2 warnings). Esos cuatro archivos no tienen cambios frente a HEAD. No se limpió deuda ajena.

### Cobertura y capas

Node 20 dispone de `--experimental-test-coverage`; se usó, sin nuevas dependencias.

| Archivo cambiado ejecutable      | Líneas | Branches | No cubierto                                                  |
| -------------------------------- | ------ | -------- | ------------------------------------------------------------ |
| `source-color-contract.mjs`      | 100%   | 100%     | —                                                            |
| `color-contract.test.mjs`        | 100%   | 85.71%   | Sin líneas; ramas de diagnóstico no recorridas               |
| `source-color-contract.test.mjs` | 98.02% | 100%     | 60–61, callback de reporte de hallazgos de la auditoría real |

Agregado reportado por V8: **99.71% líneas / 97.96% branches**. Incluye tests, NO cobertura de los 15 TSX modificados ni CSS renderizado. Promedio de los 3 `.mjs` cambiados: 99.34% líneas; producción del analizador: 100%. No se configura un umbral específico para este runner frontend. El `jest --coverage` cacheado en config es del backend y no prueba este cambio.

Distribución: **29 pruebas unitarias/de contrato fuente en 6 archivos test** (4 existentes + 2 nuevos); **0 integración DOM y 0 E2E**. Los 13 contratos nuevos incluyen lectura de CSS y AST; sus resultados NO son pruebas de interacción ni contraste efectivo.

## Strict TDD y calidad de aserciones

| Check                       | Resultado                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| TDD Cycle Evidence          | Presente en apply-progress; Safety Net 16/16 antes de implementación reportada                                                       |
| Tests RED existen           | Sí: los 2 archivos nuevos están presentes; evidencia histórica RED por unidad, no replay retroactivo del ciclo completo              |
| GREEN independiente         | Confirmado: 29/29 finales                                                                                                            |
| Triangulación analizador    | Positivos y negativos: paleta, utilidades arbitrarias, inline, SVG, variables, plantillas, referencias inválidas; no solo caso vacío |
| Contratos CSS               | Valores reales de hoja y contraste matemático de 4 pares opacos; no simulación de navegador                                          |
| Safety Net de UI modificada | Solo suites existentes, no tests DOM de Card/modal/switch/hover; limitación declarada y tareas 2.2/2.3 abiertas                      |

La revisión NO certifica TDD de comportamiento completo: las modificaciones de clases/pares no tienen RED/GREEN DOM. Tampoco atribuye cobertura de componentes al scanner. Esto permanece como WARNING y gate visual abierto, sin degradación silenciosa a Standard Mode.

**Auditoría de aserciones:** no se encontraron tautologías, loops fantasma ni mocks excesivos en los 2 tests nuevos. El resultado vacío del analizador tiene compañeros negativos no vacíos. Los loops recorren listas explícitas; el grafo tiene cardinalidades comprobadas antes de sus aserciones. Las aserciones CSS son válidas como contratos estáticos, pero insuficientes para las afirmaciones de comportamiento S03–S05.

## Matriz de cumplimiento por escenario

`COMPLIANT` aquí exige ejecución que pruebe el ámbito indicado. Leer documentación o CSS no equivale a probar UI.

| Req. / escenario                                                    | Evidencia                                                                                                                                                     | Resultado                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| R01 / S01: componente compartido y consumidores trazables           | Inventario/checklist FDM-H/R/C conservados; grafo ejecutado `all reachable application sources obey the screen color contract`; 41/128 y 0 renders declarados | PARTIAL: trazabilidad estructural comprobada, sin test conductual del seguimiento |
| R02 / S02: guard rechaza indefinidos/literales y pasa tras corregir | `source-color-contract.test.mjs`: 6 tests de analizador/grafo, fixtures positivas/negativas y regresión final                                                 | COMPLIANT para contrato fuente soportado; no promesa de parser CSS universal      |
| R02 / S03: estados normal/hover/foco/disabled/error/loading/empty   | Cambios en Card/modal/hover/switch, inspección de Button/Input/Select/tabla; ningún test DOM ni ejecución visual de estados                                   | UNTESTED en comportamiento — CRITICAL C01                                         |
| R03 / S04: Sonner y controles reales                                | `color-contract.test.mjs` native/Sonner/loading pasan; API y styles.css instalados de Sonner inspeccionados; theme light                                      | PARTIAL estático; render/controles SO UNTESTED — C01                              |
| R04 / S05: impresión HTML y PDF generado                            | Contratos print pasan, corrección confirmada en CSS dev emitido; PDFs intactos                                                                                | PARTIAL estático; salida real HTML/PDF UNTESTED — C01                             |
| R05 / S06: cierre incompleto mantiene gate                          | tasks/checklist/state mantienen fase 1 abierta y fase 2 bloqueada                                                                                             | PARTIAL: política documental verificada, no escenario automatizado                |
| R05 / S07: no activar fase 2                                        | Diff sin dark palette/selector/persistencia/dependencia, Sonner light explícito                                                                               | PARTIAL: ausencia comprobada estructuralmente, no test conductual                 |
| R06 / S08: ciclo/evidencia y ejecución segura                       | apply-progress registra RED/GREEN; suite/calidad independientes dentro Docker; builds 0; limitaciones abiertas                                                | PARTIAL: GREEN reproducido, historia RED reportada y sin pruebas DOM              |

**Resumen conductual estricto:** 1/8 escenarios con test ejecutado que satisface todo su ámbito estático; los demás tienen evidencia parcial/documental o carecen de ejecución de UI. No se declara 8/8 por presencia de código.

## Corrección estructural y coherencia

| Decisión / requisito                                       | Verificación                                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Extender design system existente, sin framework/tema nuevo | Cumplido; 11 tokens nuevos y pares success/warning, superficie y scrim definidos                                                              |
| Texto compatible con superficies/hover                     | Correcciones presentes; contraste efectivo y opacidades pendientes                                                                            |
| Sonner                                                     | Variables/selectores coinciden con API/CSS 2.x instalado, con especificidad suficiente y estados/acciones/cierre; validación visual pendiente |
| Nativos                                                    | Base light/accent/texto/fondo/foco/disabled y Input en auditoría; límites SO registrados                                                      |
| Documentos y excepciones                                   | Scope print y cinco PDFs preservados; marca/Bull Board/assets/componentes no alcanzables delimitados; confirmación real pendiente             |
| Seguridad del alcance                                      | Sin cambios de reglas monetarias, tenant, datos clínicos, API o dependencias                                                                  |

### Defectos encontrados y corregidos durante revisión

1. **Print y `@theme inline`:** el remapeo inicial de `--color-*` no podía cambiar utilidades emitidas con literales. Se notificó a apply, que añadió pintura explícita de descendientes dentro de print y test RED/GREEN. Confirmado en CSS dev existente: `.bg-surface` contiene `#f8fafc`, `.text-on-surface` contiene `#0f172a`; `[data-document-print] *` ahora fija papel/tinta/borde y elimina sombras. Defecto estructural resuelto; impresión real todavía pendiente.
2. **Guard incompleto:** literales estáticos habituales `bg-[blue]`, `text-[rebeccapurple]`, `borderBottomColor: '#fff'`, `fill={'#fff'}` y `bg-brand` devolvían cero hallazgos. Apply agregó fixtures negativas y soporte. Regresión final 29/29 confirma estos casos; no implica soporte de concatenaciones fragmentadas, runtime, todos los dialectos CSS ni dependencias externas.

## Hallazgos pendientes

### CRITICAL

**C01 — Gate visual/conductual sin ejecutar.** R02–R05, S03/S04/S05; tasks 2.2/2.3/3.4/3.5 y gates FDM-G003/G004/G005. Faltan las 41 rutas y estados aplicables, contraste efectivo (incluidas opacidades/foco), Inicio/pagos sin mutar datos reales, Sonner, controles nativos, logos y salidas HTML/PDF. No se conoce un defecto visual actual: falta evidencia obligatoria. **Bloquea archivo y fase 2.** Resolver mediante QA real documentada con sesiones/roles/fixtures autorizados; no cerrar por inspección fuente.

### WARNING

**W01 — Lint global sigue rojo por deuda previa comprobada.** 6 errores/3 warnings; lint dirigido del cambio pasa salvo el error previo reproducido de lab-payment-form. Resolver o registrar aceptación explícita de deuda, sin limpieza incidental.

**W02 — TDD/coverage de comportamiento incompletos.** No hay pruebas DOM/E2E nuevas; el guard y CSS assertions no cubren render, interacción, cascada efectiva ni impresión. Mantener la limitación visible y completar aceptación real; no presentar 29/29 o 100% del analizador como 100% de UI.

### SUGGESTION

**S01 — Integrar comando de contratos al flujo recurrente.** Hoy se invoca explícitamente `node --test …`; `package.json` no expone test frontend ni lint lo incluye automáticamente. Incorporarlo a un comando/CI existente evitaría olvidar el guard, con el costo de una ejecución adicional; no requiere instalar paquetes.

## Continuidad / resumen de sesión

- **Objetivo:** verificar fase 1 sin iniciar dark mode ni ejecutar builds.
- **Realizado:** revisión independiente completa del diff; suite final 29/29, cobertura V8, typecheck, lint dirigido y deuda HEAD comprobados; dos defectos notificados a apply y correcciones revalidadas.
- **Pendiente:** QA real y confirmación de excepciones; conservar fase 1 parcial y fase 2 bloqueada. Revalidar después de esa evidencia antes de archive.
- **Archivos relevantes:** `globals.css` (contrato y print), `shared/design-system/` (guard/suites), `checklist.md` (inventario/aceptación), `tasks.md`/`apply-progress.md` (continuidad).
- **Persistencia:** Engram no está disponible entre las herramientas; no se simularon mem_search/mem_save/mem_session_summary. Este informe persiste en el backend OpenSpec autorizado.

## Key Learnings:

1. `@theme inline` inserta valores en utilidades: sobrescribir variables de tokens no basta para print o un futuro tema. La fase 2 deberá contemplarlo explícitamente.
2. Un guard de fuente necesita fixtures negativas de sintaxis habitual y jamás certifica render, contraste efectivo ni controles del SO.

## Fase 2 — evidencia del implementador (no revisión independiente)

39/39 tests Docker aprobados (29previos+10nuevos), typecheck y ESLint dirigido aprobados. Lint global mantiene6errores3warnings preexistentes. Estado: implementación lista, revisión independiente y QA visual autenticada pendientes. No builds ni instalación. Ver apply-progress.md para RED/GREEN, alcance tests y limitaciones; no confundir esta sección con la verificación independiente fase1.

## Incidente CSS dev — verificación técnica (2026-10-15)

La descarga inicial servida carecía de `:root[data-theme="dark"]` aunque la fuente montada y su procesamiento directo sí lo incluían. El watcher regeneró el artefacto durante la investigación; la descarga posterior contiene los 31 tokens oscuros correctos. Se agregó integración HTTP opt-in que verifica el CSS realmente enlazado por `/login`, no solamente el archivo fuente. No se cambió el store ni el switch; causa del desfase interno del cache Next todavía no demostrada.

Última corrida Docker con `THEME_TEST_URL=http://localhost:3000`: **40/40 tests** (24 design-system + 16 platform-shared), typecheck aprobado, ESLint y Prettier del test nuevo aprobados. RED registrado contra CSS inicialmente capturado; GREEN contra servidor regenerado. No builds, no limpieza de cache ni datos, no navegador. Validación visual de conmutación queda a cargo del usuario por instrucción explícita; esto NO certifica render ni cierra aceptación visual fase 2.
