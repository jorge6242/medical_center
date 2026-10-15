# Apply progress — fase 1

## Estado vigente — cierre 2026-10-15

Fase 1 completada y aceptada mediante revisión independiente (29/29, typecheck y lint dirigido) y aceptación humana global de vistas/estados/notificaciones/nativos/impresión/PDF. Ver [acceptance.md](acceptance.md): no hay QA visual ejecutada por agente ni evidencia granular/mediciones ni tests DOM/E2E retroactivos. W01/W02 conservados, no corregidos. Fase 2 lista para planificación y decisión de comportamiento/runtime; no implementada. Los bloqueos y pendientes inferiores son historia previa al cierre. Sin código, tests, builds ni commits nuevos en este registro.

## Estado inicial histórico: bloqueado por entorno

Fecha: 2026-10-15. El usuario autorizó **modo automático y una entrega única sin divisiones**. Estrategia resuelta: `exception-ok`, con `size:exception` explícita para el forecast de 450–750 líneas de implementación/tests. No se crearán PRs, commits ni ramas sin pedido.

La ejecución de producción **no comenzó**: Strict TDD requiere Safety Net antes de modificar fuentes y GREEN ejecutado antes de continuar. No se degradó a Standard Mode ni se ejecutó runtime en el host.

## Evidencia de bloqueo

Se inspeccionaron Makefile y `docker-compose.dev.yml` para confirmar el servicio y los mounts. Luego se intentó, desde la raíz del repositorio:

```sh
docker compose -f docker-compose.dev.yml exec -T web sh -lc 'node --version'
```

| Intento                                                                | Resultado                                                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sandbox normal                                                         | Exit 1: `Cannot connect to the Docker daemon at unix:///Users/jorgegomez/.docker/run/docker.sock. Is the docker daemon running?` |
| `require_escalated` para comprobar el contenedor existente, sin builds | Mismo error, exit 1. No fue un rechazo de aprobación.                                                                            |

No se atribuye el fallo a permisos del sandbox: persiste con escalación. Tampoco prueba que el servicio web esté detenido; el daemon no permite consultar su estado.

## TDD Cycle Evidence

| Tarea   | Safety Net                                  | RED                     | GREEN        | Triangulación / refactor |
| ------- | ------------------------------------------- | ----------------------- | ------------ | ------------------------ |
| 2.1–2.5 | Bloqueado antes de ejecutar suite existente | No escrito ni ejecutado | No ejecutado | No iniciados             |

Tests ejecutados: **0**. Tests nuevos: **0**. Archivos de producción modificados: **0**. Builds: **0**. Rutas/estados validados visualmente: **0**. Ningún hallazgo se cerró.

## Precisión de la estrategia de verificación

El guard de referencias/literales propuesto en design.md es **análisis estático del contrato fuente**: no es test de comportamiento ni demuestra render, contraste o accesibilidad. Las aserciones de clases CSS no se presentarán como tests de componentes. La regla `strict-tdd.md` exige separar esas evidencias; las verificaciones de pares efectivos y estados requieren render/validación visual por separado. Esta distinción deberá mantenerse al escribir la suite, sin afirmar cobertura DOM inexistente.

## Continuación

1. Restaurar Docker y comprobar el contenedor web existente, **sin builds**. No instalar dependencias ni ejecutar Node/pnpm/TypeScript en host.
2. Ejecutar Safety Net documentada en design.md; registrar resultado antes de tocar producción.
3. Retomar tareas 1.4 y 2.1–2.5 con RED → GREEN observado y evidencia por tarea.
4. Ejecutar calidad y actualizar inventario; mantener gates visuales abiertos mientras falte evidencia.

**Fase 2 permanece bloqueada.** No se agregó tema oscuro, selector ni persistencia.

## Reanudación — implementación de fase 1 (2026-10-15)

**Estado actual: implementación realizada; aceptación visual y revisión final pendientes.** El bloqueo anterior es histórico, no el estado vigente. Docker se verificó, no se asumió por el mensaje del usuario: `docker compose -f docker-compose.dev.yml ps` confirmó api/web Up y db healthy. No fue necesario arrancar ni construir servicios. Algunas llamadas posteriores exigieron `require_escalated` por permiso del socket; funcionaron.

### Safety Net y TDD observado

Comandos desde raíz, todos dentro del servicio `web`, con `cd /app/apps/web`:

```sh
docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && node --test src/features/platform-shared/*.test.mjs'
docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && node --test src/shared/design-system/*.test.mjs'
docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && node --test src/shared/design-system/*.test.mjs src/features/platform-shared/*.test.mjs'
docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && pnpm run typecheck && pnpm run lint'
```

| Unidad                  | RED observado antes del cambio                                                           | GREEN observado                                                                | Triangulación / refactor                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 Tokens              | `missing semantic token: success`, 0/1                                                   | 1/1 tras 11 definiciones                                                       | Test adicional de contraste de los 4 pares opacos success/warning ≥4.5:1; no es contraste renderizado. Definiciones constantes: sin branching que triangular.               |
| Guard / 2.2–2.3 paletas | Módulo analizador ausente; luego 2/3 con 33 hallazgos únicos archivo/color en 7 archivos | 3/3 tras sustituir paletas UI por tokens                                       | Dos fixtures iniciales positivas/negativas; nuevas fixtures SVG/variables/plantillas fallaron 3/5 y pasaron 5/5 tras extender AST.                                          |
| 2.4–2.5 contratos CSS   | 1/4: faltaban contratos root, adapter Sonner e impresión                                 | 6/7 tras cambios por parser que leía overrides print; corregido su ámbito, 8/8 | El parser inicial tomaba últimos overrides print por error; se acotó a `@theme`. No se falseó GREEN cambiando el contrato.                                                  |
| Adapter Sonner ampliado | 4/6: faltaba selector más específico y roles grayscale loading/hover                     | 11/11 contratos finales                                                        | Se inspeccionaron `dist/index.d.ts` y `styles.css` instalados; se cubrieron variables normal/success/warning/error/info, description, action/cancel/close, focus y loading. |
| Regresión final         | Safety Net anterior: 16/16                                                               | **27/27 total**, tras formato                                                  | 16 existentes + 11 contratos fuente/analizador. Ninguno es un test DOM ni E2E.                                                                                              |

La alineación de clases/pares de Card, modal, hover, switch, dropdown y reutilización de Input se verifica por inspección fuente; **no se atribuye TDD de comportamiento ni cobertura render a esas modificaciones**. El tooling existente no ofrece DOM/RTL/Playwright y no se agregaron dependencias. Esta limitación queda abierta para QA y verificación independiente.

### Cambios implementados

- `globals.css`: success/warning y pares de contenido/contenedor; surface-container/high compatibles con on-surface; scrim; contrato nativo light/accent/focus/disabled; adapter Sonner y paleta print documental.
- H004–H009: error/404/loading/onboarding/perfil/Badge sin paletas directas. H010: scrim semántico.
- Card/modal usan contenido on-surface explícito; dropdown usa elevación compartida; switch expone foco peer/disabled; botones de pago/laboratorio usan on-primary-container durante hover.
- Auditoría reutiliza Input; todos los controles nativos reciben el contrato base (las utilidades locales pueden especializarlo). No se reemplazaron formularios ni lógica clínica/financiera.
- `providers.tsx`: Sonner mantiene modo **light**, con adapter explícito; no hay preferencia de tema.
- Historia clínica: ámbito `data-document-print` remapea todas las superficies/textos usados por sus tarjetas a papel/tinta documental en print. No afecta PDFs ni tema de pantalla.
- Inventario revalidado por AST: 41 páginas/128 TSX; cinco PDFs acotados explícitamente; políticas de marca/externos/recursos sin uso en inventory.md §9.

### Calidad y deuda preexistente

- **Typecheck aprobado** (`pnpm run typecheck`).
- **Lint global falla: 6 errores y 3 warnings**. Archivos: lab-payment-form (`useState` sin usar), report-excel (`metaRows`, `periodStart`, `periodEnd`), report-export-sidebar (`Download`), use-reports (`GenerateReportParams`, assertion), medical-record-dynamic-form (2 assertions).
- Los últimos cuatro archivos no fueron modificados. En lab-payment-form, se verificó fuente HEAD original mediante `git show HEAD:... | docker compose ... exec -T web ... pnpm exec eslint --stdin --stdin-filename src/features/lab-orders/components/lab-payment-form.tsx --max-warnings 0`: reproduce exactamente error `3:10 useState` preexistente. No se corrigió deuda ajena.
- Lint dirigido a herramientas nuevas y componentes pequeños editados: comando separado sin CSS (ESLint no configura CSS; incluirlo produce warning de archivo ignorado). Resultado final: aprobado, exit 0, junto con check de formato de los mismos archivos y CSS.
- Formato de las tres herramientas `.mjs`, CSS y componentes pequeños editados aplicado/comprobado con Prettier dentro de Docker. No se formatearon globalmente consumidores extensos con formato previo diferente.
- Builds **0**, installs **0**, cambios backend/dependencias/lock **0**, commits/PRs **0**.

### Gate y continuidad

No se abrió sesión autenticada de navegador ni se validaron 41 rutas/estados/recursos. H011–H014/H016/H020/H023/H030/H031 y todos los checks de contraste efectivo/foco nativo continúan abiertos. Los bordes outline/40 y opacidades derivados de tokens se conservaron: no hay evidencia visual que justifique sustituirlos indiscriminadamente. Los logos y PDFs necesitan pruebas reales separadas.

La implementación NO cierra fase 1. Fase 2 sigue bloqueada hasta aceptación estática independiente, visual y excepciones confirmadas. Engram no está disponible; persistencia física exclusivamente.

## Correcciones de verificación independiente

La revisión detectó un defecto real: **`@theme inline` compila utilidades con hex literales**, por lo que remapear `--color-*` en print no repintaba por sí solo los hijos. Se reprodujo RED con ausencia de paint documental explícito en descendientes (6/7 tests CSS), y se corrigió con regla print unlayered `[data-document-print] *` para fondo/tinta/borde/sombra. El verificador confirmó esa regla en CSS dev emitido y su precedencia sobre utilities layer. Falta comprobar salida impresa real.

Se mantienen los overrides semánticos del ámbito como contrato documental, pero la garantía actual viene de paint explícito, NO de las variables. Se conserva `@theme inline`: cambiar la arquitectura de tema runtime pertenece a fase 2. **La tokenización fuente no implica que la base ya soporte conmutación de tema runtime.**

La revisión también encontró sintaxis estáticas que escapaban al guard: named colors arbitrarios, longhand de pintura y SVG expression literal. Se agregó fixture RED (5/6) y se corrigió el AST. Background desconocido como `bg-brand` también se detecta. Se evita un falso positivo en clave `outline` de CVA sin omitir sus strings de clase. No se persigue análisis de concatenaciones/runtime.

**Última corrida después de correcciones: 29/29** (13 contratos fuente/analizador + 16 existentes), typecheck aprobado, lint de herramientas aprobado. Estas corridas reemplazan el total previo de 27, conservado arriba como historia real de TDD.

Check Prettier de TODOS los archivos editados: advierte 9 consumidores con formato previo; no se aplicó reescritura global para evitar diffs ajenos al alineamiento. Fuentes HEAD originales comprobadas con `git show HEAD:<path> | docker compose ... exec -T web ... pnpm exec prettier --check --stdin-filepath <path>`; resultados registrados al finalizar. Nuevos archivos/CSS/componentes pequeños sí pasan el check dirigido. ESLint de TODOS los TSX editados salvo lab (fallo original comprobado) aprobado.

Formato HEAD confirmado: los nueve archivos advertidos (admin/auditoria, mi-perfil, error, loading, not-found, onboarding, medical-record-detail-panel, consultation-payment-form y lookup-combobox) devuelven exit 1 también con su contenido original HEAD por stdin. No se atribuyen esos formatos al cambio ni se oculta que el check de todos los tocados no está limpio. Check dirigido nuevo/CSS/componentes pequeños sí aprobado.

## Fase 2 — selector claro/oscuro implementado (2026-10-15)

Autorización: automático, entrega única exception-ok; switch claro/oscuro, sin sistema. Nueva spec: specs/frontend-dark-theme/spec.md. Aceptación fase 1 conservada; fase 2 pendiente de validación visual propia.

| Evidencia                                    | Resultado                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net                                   | 29/29 antes de editar producción                                                                                                                                            |
| RED preferencia                              | theme.ts ausente (ENOENT), antes de producción                                                                                                                              |
| RED paleta                                   | ausencia de dark; fixture inicial esperaba 33 por documentación previa, corregida a 31 roles reales y no-vacuidad (dark.size=31)                                            |
| GREEN                                        | 39/39: 29 previos + 8 comportamiento puro/mock bootstrap/store + 2 contratos CSS/paleta                                                                                     |
| Triangulación                                | dark/light/null/system/denegación storage; toggles ambos sentidos, idempotencia y cleanup; no requests/navegación en mock; 13 pares on-\* oscuros contrastados en hex opaco |
| Typecheck                                    | pnpm run typecheck aprobado                                                                                                                                                 |
| Lint dirigido                                | aprobado en todos archivos TS/TSX/MJS fase 2                                                                                                                                |
| Formato dirigido                             | Prettier aplicado a nuevos/theme y root/providers/CSS; sin formato global                                                                                                   |
| Builds / installs / backend / deps / commits | 0                                                                                                                                                                           |

Runtime CSS cambia @theme inline por @theme para variables en utilidades. 31 roles reales en ambas paletas, no 33: conteo histórico de fase 1 no coincide con CSS verificado (se conserva historia, este registro corrige conteo vigente). Nuevo theme-controls.tsx lleva alcanzables de 128 a129 TSX, páginas siguen41. Selector en topbar tenant y shell plataforma; Toaster aislado. html script estático aplica storage antes de cuerpo y atributo hydration-suppressed exclusivamente en html; sin interpolación de datos externos. Ninguna CSP encontrada en frontend/compose; si se añade CSP, autorizar bootstrap mediante hash/nonce.

Preferencia key centro-medico-theme, solo light/dark; fallback light y tolerancia a storage denegado. Cambio idempotente modifica atributo, intenta persistir y emite evento propio; suscriben solo switch/toaster mediante useSyncExternalStore. Sin context global ni estado cambiante en Providers/layout, sin memoización indiscriminada. Los tests no son mediciones de React profiler: NO se certifica cantidad real de renders del árbol.

Paleta Sonner y nativos siguen tokens y color-scheme. Print fuerza light y papel/tinta existentes (incluso raíz dark); PDFs no modificados. Logos intactos, sin recolorear: legibilidad de cada recurso requiere QA oscuro real.

QA navegador independiente del coordinador: /inicio redirige login sin sesión; DOM público root light, scheme light, body blanco comprobados. No se ejecutó switch autenticado ni restauración dark en navegador, contraste efectivo, estados, logos o impresión. Pruebas VM de bootstrap no sustituyen prueba de flash/reload/hydration en navegador. Sin aceptación visual fase 2; no archivar.

Lint global fase 2 reejecutado: mantiene exactamente 6 errores y 3 warnings en los mismos cinco archivos previos (lab-payment-form, medical-record-dynamic-form, report-excel, report-export-sidebar, use-reports). No nuevos errores ni correcciones incidentales.

## Incidente de conmutación — CSS de desarrollo desfasado (2026-10-15)

- Reporte: el switch no cambia la apariencia después de reiniciar contenedores.
- Evidencia: la primera descarga de `/login` enlazaba `apps_web_src_app_globals_10btyws.css`; ese CSS servido no contenía ningún `data-theme` ni la paleta oscura. El archivo fuente montado dentro de Docker sí contenía los dos selectores y `@tailwindcss/postcss` procesándolo directamente generó ambos. La discrepancia estaba en el artefacto dev servido, no se reprodujo un defecto del store ni del handler.
- RED: una aserción ejecutada en Docker contra la descarga inicial conservada en `/tmp/theme-runtime.css` falló por ausencia del selector oscuro. Esta captura es evidencia temporal, no un fixture versionado.
- Recuperación observada: al escribir el nuevo test en el árbol observado por Next, el watcher regeneró el CSS; una nueva descarga incluyó los selectores y los 31 roles oscuros. No se borró caché, no se cambió lógica de producción, no se hicieron builds ni se tocaron datos. No está probado por qué el reinicio anterior dejó el artefacto obsoleto.
- Regresión agregada: `apps/web/src/shared/design-system/runtime-theme-css.test.mjs`, integración opt-in con `THEME_TEST_URL=http://localhost:3000`. Descarga HTML y CSS enlazado y compara los 31 roles oscuros con fuente, normalizando hex abreviados. Sin variable, se omite explícitamente; no depende de servidor activo en corridas ordinarias.
- GREEN: 24/24 contratos design-system con integración activada; typecheck y ESLint dirigido aprobados. Suite completa registrada en continuación/verificación.
- Límite: no se abrió navegador ni se validó interacción visual; el usuario valida UI. No se afirma corrección de un handler que no presentó defecto ni que este test mida render/contraste/memoización. Si reaparece, repetir test servido antes de atribuirlo al switch.

Corrida final del incidente: **40/40 tests** con integración activada (24 design-system +16 platform-shared); ESLint/Prettier del test nuevo aprobados. Typecheck aprobado en corrida precedente sin cambios posteriores en TypeScript.

## Ajuste puntual — selector de tema distinguible (2026-10-15)

- Objetivo: solamente el control de tema; el usuario solicita visibilidad en claro y texto que anuncie el destino. No se modifican store, paleta, layout ni Switch compartido.
- Decisión accesible: `ThemeSwitch` ahora es botón nativo de acción con apariencia track/thumb y sol/luna decorativos. Texto `Modo oscuro` en claro y `Modo claro` en oscuro; nombre accesible `Cambiar a modo …`. Sin role switch/aria-checked/aria-pressed: WAI APG exige label estable para switch/toggle button, incompatible con una etiqueta que anuncia la acción destino. No basta cambiar label manteniendo role switch.
- Estados: track `on-surface-variant`, thumb `surface`, texto/icono `on-surface`; hover `surface-variant`, foco `primary`, altura mínima44px. Movimiento solo thumb y desactivado con reduced motion. No nuevos colores ni tokens.
- Contraste calculado opaco: claro track/thumb7.24:1, track/hover6.92, texto/surface17.06, texto/hover16.30, foco/surface5.91 y foco/hover5.64. Oscuro11.95,9.85,16.19,13.35,9.84 y8.11 respectivamente. Estos cálculos NO certifican el render real.
- TDD: dos tests RED fallaron con el Switch anterior (esperado botón, obtenido Switch), luego GREEN ambos. Se transpila TSX, hook de tema aislado devuelve ambos valores, se verifica markup SSR real React, etiqueta/semántica y handler destino. No es un montaje DOM ni interacción con teclado en navegador. Tercer test comprueba contraste de tokens en ambos temas y hover.
- Aislamiento conservado: misma suscripción useSyncExternalStore local; sin useEffect adicional, navegación, red, context global ni memoización innecesaria. Persistencia sigue siendo la existente; no se afirma cero renders ni medición Profiler.
- Referencias de criterio: https://www.w3.org/WAI/ARIA/apg/patterns/switch/ ; https://www.w3.org/WAI/ARIA/apg/patterns/button/ ; https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast .
- No navegador (usuario valida), builds, deps ni commits. Engram no está expuesto: decisión/contexto preservados en OpenSpec físico.
- Verificación final Docker: **43/43 tests** (integración HTTP CSS activada, cero skips), `pnpm run typecheck`, ESLint dirigido y Prettier aprobados. Sin lint global ni verificación visual nueva.

### Resumen de sesión — ajuste del selector

- Goal: distinguir el selector y mostrar destino claro/oscuro sin tocar otras piezas.
- Instructions: solo toggle, sin navegador ni builds; usuario valida apariencia; preservar aislamiento.
- Discoveries: el switch anterior usa label fijo; cambiarlo conservando role switch contradice WAI APG. Tokens actuales permiten contraste alto sin nuevos colores.
- Accomplished: botón acción estilizado, sol/luna, destino dinámico, contraste, tests RED/GREEN y documentación T05.
- Next Steps: validación visual del usuario en ambas paletas; aceptación fase2 sigue pendiente.
- Relevant Files: theme-controls.tsx (único componente producción), theme-controls.test.mjs (SSR/hook mock/handler), theme-palette.test.mjs (contraste opaco), spec frontend-dark-theme y este apply-progress.

## Key Learnings:

1. Un control cuyo nombre cambia para describir destino funciona semánticamente como botón de acción, no como switch con label variable.
2. Track/thumb pueden distinguirse usando tokens existentes contrastados sin modificar el switch genérico de formularios.
