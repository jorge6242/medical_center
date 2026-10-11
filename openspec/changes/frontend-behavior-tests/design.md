# Design: Pruebas frontend orientadas a riesgo

## Enfoque técnico

**Planificación, no cobertura implementada.** Cubrir comportamientos de las 29 vistas recomendadas por `inventory.md`; mantener 2 diferidas y 3 auxiliares sin suite propia. Formularios compartidos se prueban una vez y referencian múltiples IDs. La especificación `specs/frontend-behavior-testing/spec.md` define los resultados; este diseño define sus límites técnicos.

## Decisiones de arquitectura

| Decisión            | Elección y motivo                                                                                                                                                                                                                                                         | Alternativa / tradeoff rechazado                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner              | Proponer Jest 30 + `next/jest`, jsdom, React Testing Library, user-event y jest-dom. Next configura transformación/imports; Node 20 del Dockerfile y TypeScript 5.9.3 del lock satisfacen mínimos documentados. Versiones exactas y React 19 requieren smoke test futuro. | Vitest requiere otra integración Vite y verificar versiones compatibles con Node 20; no cambiar runtime sólo por testing. Jest API no configura automáticamente web. |
| Límite HTTP         | MSW Node para integración componente → hook → service → fetch: validar payload, error e invalidación sin mockear todo el árbol. Rechazar solicitudes no manejadas.                                                                                                        | Mock de service sólo en unitarias aisladas; mockear todos los hooks oculta errores de integración. MSW añade configuración ESM/polyfills que debe validarse primero. |
| Unidad de cobertura | Tests colocados junto al componente/formulario/lógica real; páginas con comportamiento propio sí se prueban.                                                                                                                                                              | Suite por cada wrapper duplica mantenimiento. No mover UserForm/UserEditForm de su ubicación actual sólo por estética.                                               |
| Navegador           | Playwright propuesto para contexto server/auth y flujos críticos reales con datos sintéticos.                                                                                                                                                                             | jsdom no demuestra navegación real, cookies HttpOnly, tenant safety ni idempotencia backend; más E2E aumenta tiempo y coste.                                         |
| Compartidos         | Sólo DataTable, búsqueda/debounce, timezone y selección/validaciones propias cuando impactan escenarios.                                                                                                                                                                  | Tests de títulos, iconos, CSS, snapshots masivos o utilidades triviales no justifican coste.                                                                         |

Fuentes: [Next/Jest](https://nextjs.org/docs/app/guides/testing/jest), [Jest 30](https://jestjs.io/docs/upgrading-to-jest30), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [MSW Node](https://mswjs.io/guides/integrations/node). Next recomienda E2E para Server Components async, no renderizarlos artificialmente como cobertura completa.

## Flujo e aislamiento

```
user-event → componente + QueryClient propio → hook → service → apiFetch
                                                           ↓
                                               MSW → fixture sintética
Playwright → Next dev → API/DB de prueba → efecto real verificable
```

Helper `src/test/render.tsx`: QueryClient nuevo por test, retries desactivados y caché limpiada al terminar; no cambiar `query.config.ts` de producción. Restaurar handlers, mocks, DOM y auth store entre tests. Separar fixtures de fábricas jest.fn locales. Fijar reloj/zona America/Caracas; fake timers sólo para debounce, avanzados con user-event y restaurados. Simular router/contexto únicamente en componente; slug server y redirección 401 necesitan navegador. Nunca datos, cookies o credenciales reales.

## Archivos futuros y contratos

| Ruta                                                              | Acción futura                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/web/jest.config.ts`; `src/test/{setup,render}.ts(x)`        | Runner, alias @/, lifecycle, providers                                       |
| `apps/web/src/test/{fixtures,handlers}/`                          | Datos sintéticos y HTTP tipado; handlers por dominio                         |
| `apps/web/src/features/**`, `src/shared/**`, páginas interactivas | Suites `*.test.ts(x)` junto al objetivo; extracción mínima sólo si necesaria |
| `apps/web/package.json`, `pnpm-lock.yaml`                         | Scripts/dependencias de test; ninguna modificación ahora                     |
| `docker-compose.dev.yml`                                          | Montar config web/tsconfig y futuros E2E explícitamente; src ya montado      |
| `apps/web/playwright.config.ts`, `e2e/`                           | Navegador/fixtures futuros; entorno Docker compatible pendiente              |

Sin schema Prisma, migraciones ni DTO API nuevos. Consumir contratos existentes tipados: ID seleccionado, campos enviados, filtros vigentes, datos recibidos. PDF/Excel: afirmar dataset/ID/opciones entregados al generador; un generador mock NO valida archivo, contenido renderizado ni layout. Validar salida real separadamente.

## Estrategia de pruebas y ejecución

| Capa                    | Protección                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Unitaria                | Schema/transformación propia, fechas/selección; no duplicar cálculo autoritativo API                   |
| Componentes/integración | Invalid → no request; válido → payload correcto; pendiente/error/vacío; selección y cache invalidation |
| E2E                     | Login/contexto, Inicio → cobro, anulación y documento correcto                                         |

Disponibles: `make shell-web` y dentro `pnpm run typecheck` / `pnpm run lint`; `make deps-sync` regenera lock en Docker. Propuestos, todavía inexistentes: `test`, `test:coverage`, `test:e2e`. Instalar/sincronizar dependencias mediante container existente sin build; verificar disponibilidad y mounts, sin asumir instalación host ni imagen nueva.

Bootstrap es prerrequisito; después RED-GREEN-REFACTOR obligatorio, registrando comando/salida roja por comportamiento, verde y regresión. Fallo de import/runner no cuenta como RED.

## Progreso, entrega y riesgos

`tasks.md` checklist; `inventory.md` ruta→escenario→tarea→suite; `progress.md` append-only fecha/comando/resultado/evidencia; `state.yaml` estado de fases. Sólo marcar verificada con evidencia reproducible; planificación terminada ≠ tests terminados.

Orden: bootstrap, Inicio/cobro, altas restantes, medias. Slices autónomos con tests/docs <400 líneas; lock puede exceder presupuesto. `ask-on-risk`: resolver encadenamiento o excepción antes de apply futuro, no ahora.

Pendientes: política de borrado permanente de especialidades; contratos históricos de consultas/pagos; infraestructura navegador Alpine/DB sintética; compatibilidad efectiva runner/MSW/React. No inventar filtros/acciones para cumplir inventario. Rollback documental sin runtime; futuro revertir slice completo, sin cambios de datos ni refactor general.
