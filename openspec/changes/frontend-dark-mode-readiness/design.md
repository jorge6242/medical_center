# Diseño — Fase 1

## Decisión

Extender tokens existentes, no reemplazar UI ni introducir proveedor de tema. Mantener claro como único modo activo. Fase 2 continúa bloqueada. No cambia Prisma, DTOs ni contratos API.

## Contexto verificado / inicialización SDD local

- `openspec/config.yaml` activa strict TDD pero su contexto de frontend «no test runner» está desactualizado: existen cuatro `.test.mjs` en `features/platform-shared/` que importan `node:test` y `node:assert/strict`; algunos transpilan TypeScript con dependencia existente.
- `apps/web/package.json` no tiene script test ni Jest/RTL/Playwright. El runner disponible para contratos estáticos es **Node test runner**, no tests DOM ni visuales. No instalar otro framework para esta limpieza.
- `apps/web/Dockerfile.dev`: Node 20, pnpm, WORKDIR `/app/apps/web`. Compose monta `apps/web/src`, paquete web y lock. Los tests nuevos deben vivir bajo `src` para ser visibles sin rebuild.
- `make shell-web` abre shell del servicio web. Ejecución no interactiva equivalente documentada abajo. No se verificó disponibilidad del daemon/container ni ejecutabilidad de tests en esta planificación.
- Engram no disponible: contexto y continuidad persistidos en este cambio físico; no se simulan operaciones de memoria.

## Contrato y consumidores

`globals.css` mantiene la autoridad de tokens. Añadir success/on-success/success-container/on-success-container y equivalente warning; elegir pares claros compatibles con paletas ya usadas y medir contraste antes de cerrar. Definir surface-container y surface-container-high como elevaciones de superficie claras con contenido on-surface; scrim conserva intención de overlay sin literal local.

Alinear Badge y pantallas de error/carga/404/onboarding/perfil; declarar on-surface donde hoy se hereda on-background. Corregir pares hover de pagos/laboratorio sin modificar flujos monetarios. Revisar estados, outline derivado y elevación por evidencia, no por sustitución indiscriminada de opacidades.

Sonner debe recibir estilos/clases con tokens conforme a API real de versión instalada; inspeccionarla antes de escribir integración. Validar success/error/info/loading y acción/cierre si se usan. No confiar en `richColors` como integración automática.

Controles nativos: reutilizar Input donde corresponda; hacer explícitos texto/fondo/accent y `color-scheme: light` en contrato actual. Navegador controla calendario/options en algunos sistemas; registrar límites y comprobarlos en render. No sumar abstracciones de un solo uso.

Impresión HTML: paleta clara explícita en ámbito print, incluyendo contenedores y contenido imprimible; no asumir que `body` basta si hijos conservan fondos. PDFs permanecen independientes. Logos no se recolorean; Bull Board está fuera de propiedad frontend. TSX/SVG sin uso se conservan.

## Verificación y strict TDD

Añadir tests `src/shared/design-system/color-contract.test.mjs`: resolver definiciones/referencias de tokens, detectar utilidades de paleta/colores inline fuera de contrato y excepciones acotadas, comprobar pares y adaptadores relevantes. Usar pruebas negativas del propio guard para evitar un scanner que siempre pase. Evitar una lista global de «archivos ignorados»: excepciones deben especificar recurso/motivo/alcance. Guard estático no compila Tailwind ni prueba contraste efectivo/DOM.

Cada slice: test RED documentado → cambio mínimo GREEN → suites existentes → lint/typecheck. No restaurar Standard Mode. Verificación visual usa app dev existente y sesiones/roles/fixtures autorizados; no alterar datos clínicos reales. Matriz debe separar normal/hover/foco/disabled/error/loading/empty, modal/dropdown/toast/nativos/print y logos disponibles; no marcar render de todas ramas por visitar solo ruta.

### Comandos Docker exactos (no ejecutados)

```sh
# Suite existente
 docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && node --test src/features/platform-shared/*.test.mjs'
# Suite nueva planificada
 docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && node --test src/shared/design-system/*.test.mjs'
# Calidad
 docker compose -f docker-compose.dev.yml exec -T web sh -lc 'cd /app/apps/web && pnpm run typecheck && pnpm run lint'
```

Formato: comprobar archivos tocados con `pnpm exec prettier --check <archivos>` dentro del mismo container; evitar `format` global porque reescribe fuentes ajenas. Sin build. Si container falta, informar prerrequisito; no ejecutar setup/build para resolverlo.

## Rollback y riesgo

Unidades entregables con pruebas y documentación juntas; revertir unidad completa sin tocar datos. Mayor riesgo: scanner incompleto (validar CSS arbitrario, inline, SVG y dependencias), semántica correcta sin contraste real, Sonner externo y controles del SO. La matriz visual y excepciones son gates independientes.

## Restricción confirmada al iniciar apply

`strict-tdd.md` distingue comportamiento de detalles de implementación: las aserciones sobre clases CSS no son tests válidos de componentes. El guard propuesto se tratará como lint/análisis estático del contrato fuente, con pruebas del analizador contra entradas positivas y negativas; nunca como prueba de render. La cobertura de tokens puede verificar definiciones reales de CSS y semántica, pero no sustituye comprobar estilos efectivos y estados en navegador. Docker no estuvo disponible al iniciar apply: no se escribió ni ejecutó suite nueva y no comenzó producción. Ver [apply-progress.md](apply-progress.md).

## Contrato implementado de fase 1

| Roles                                      | Uso / par                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| success / on-success                       | Estado sólido o texto de éxito sobre superficie clara; relleno sólido debe llevar on-success.  |
| success-container / on-success-container   | Badge/estado suave; siempre ambos roles juntos.                                                |
| warning / on-warning                       | Estado sólido o texto de advertencia; relleno sólido lleva on-warning.                         |
| warning-container / on-warning-container   | Badge/estado suave de advertencia; siempre emparejados.                                        |
| surface-container / surface-container-high | Escalones claros de elevación/agrupación, con on-surface o on-surface-variant según jerarquía. |
| scrim                                      | Base del overlay, con /40 en modal; no color de contenido ni superficie.                       |

Se mantuvo color-scheme light explícito, sin selector ni tema futuro. Los cuatro pares opacos nuevos de estado alcanzan ≥4.5:1 en cálculo de sus hex base; las opacidades, colores efectivos y herencias requieren medición en render.

Sonner usa un adapter CSS con `:root` para superar especificidad de defaults light, variables públicas y overrides de partes controlables. Sus primitivas grayscale utilizadas por hover/loading también se remapean. La inspección se hizo contra typings/CSS de la versión instalada en Docker, sin introducir dependencias.

Print tiene paleta propia `--document-paper/ink/outline` dentro de `@media print`, y el ámbito de historia clínica remapea los tokens que realmente consumen sus hijos. PDFs siguen usando su renderer y paleta independiente. La ejecución y las limitaciones reales están en apply-progress.md.

### Límite confirmado de `@theme inline`

Verificación independiente comprobó que Tailwind emite utilidades de color con hex literales, no referencias runtime. Por eso print usa además paint explícito unlayered sobre `[data-document-print] *`; los overrides de variables solos NO bastan. Se conserva la arquitectura inline para no introducir fase 2. Elegir tokens runtime y un mecanismo de tema queda pendiente de esa fase. El alineamiento fuente actual NO se presenta como soporte terminado de conmutación de tema.

## Fase 2 autorizada — 2026-10-15

Usuario solicita switch claro/oscuro, sin modo sistema; ejecución automática y entrega única size:exception. Fase 1 aceptada según acceptance.md.

Implementar preferencia por navegador (localStorage exclusivo para tema, nunca credenciales), fallback claro ante ausencia/error/valor inválido; cambiar html[data-theme] antes del primer paint mediante script estático sin datos del usuario. No se encontró CSP en frontend/compose; futura CSP deberá autorizar ese script por hash/nonce. Usar @theme no-inline para conservar referencias runtime de utilidades; mismos 31 roles claros y oscuros, color-scheme y elevación. Switch accesible en shell tenant/plataforma; Sonner consume theme. Impresión/PDF conservan paleta documental y logos no se recolorean. Sin dependencias, backend, builds ni commits.

- [x] P2.1 Tests RED de preferencia/inicialización y paleta; implementar GREEN.
- [x] P2.2 Contexto cliente mínimo, switch y shell; sin duplicar estado servidor.
- [x] P2.3 Ejecutar suites, typecheck/lint dirigido y registrar límites visuales.
- [ ] P2.4 Aceptación visual del tema oscuro separada; no heredar aceptación fase 1.

### Aislamiento de renders (requisito adicional)

Tema reside en html[data-theme], no en contexto React global. useSyncExternalStore suscribe únicamente ThemeSwitch y ThemeToaster; Providers y layouts no leen ese snapshot. setTheme retorna si no hay cambio; suscripción estable a nivel de módulo con cleanup. No React.memo/useMemo: no hay props cambiantes que justifiquen memoización del árbol. Cambio provoca repintado CSS y render de consumidores propios inevitablemente, no se promete cero renders. No fetch, invalidación, refresh, navegación ni remount intencional. No sincronización cross-tab solicitada; persistencia compartida aplica al próximo reload.
