# Design: Pruebas frontend orientadas a riesgo

## E046 — V10-B

Ref generación/effect payoutId+cleanup invalida callbacks viejos;estado error local visible/reintento. Snapshot válido capturado al iniciar permanece durante refetch del mismo ID;gate A sigue impidiendo nuevas exportaciones fallidas. Sin lifecycle URL nuevo ni wrapper server async/backend/PDFreal/E2E acreditados. Ledger global reservado a revisión final.

## E044 — V10-A

Error Query prevalece sobre caché;detalle debe corresponder payoutId;isFetching bloquea exportación sin cambiar lifecyclePDF. Wrapper Jest observador llama servicio real para esperar HTTP tardío,rerender conserva Provider/client. Snapshots financieros recibidos sin recalcular/rejoin;VOIDED sigue legible. B y wrapper server async/E2E no acreditados.

## E042 — V09-B2

Identidad serializada de contexto/selección/inputs/catálogos gobierna generación ref y cleanup;descarta success/catch/finally tardíos. Schema/gates A2 reutilizados,alerta local/reintento. Solo renderer/blob/anchor/notificación simulados;no validez PDF/layout,URL lifetime existente intacta. B1 preservada.

## E040 — V09-B1

Estado submittedPending guarda snapshot mientras createMutation.isPending;effect no cambia selección durante POST. Fieldset/guards protegen campos,Cancelar y submit;error explicita identidad. A2 vuelve a bloquear al fallar si catálogo está inválido;recuperación requiere HTTP válido. Sin guard global beforeunload/back ni cambio de NewPage/router real. B2 separado por root,sin excepción de tamaño.

## E038 — V09-A2

Gates Query pending/error invalidan envío aun con caché;sin datos no muestra resumen cero. Lookup fallido reemplaza selector temporalmente con alerta/reintento local,sin tocar componente compartido. Zod multipleOf0.0001 evita aritmética financiera propia;IDs locales asocian método/moneda. B pendiente.

## E036 — V09-A1

Ref local identifica doctor de selección;onChange reinicia scope/IDs,effect intersecta en refetch del mismo doctor. Otro doctor mantiene select-all inicial existente. IDs locales asocian labels;sin refactor compartido. Entrega aprobada cinco slices,A2/B pendientes.

## E034 — V08

Página/hooks/services/MSW reales;solo router y window.prompt simulados como frontera navegador. isError oculta listado cacheado engañoso;mutación conserva pending y error hasta próximo prompt fuera de pending. Motivo trim≥3 corresponde DTO autorizado. approved-chain-V08-V10-four-slices;V09/V10 pendientes,3.5 abierta.

## Enfoque técnico

**Actualización 2026-10-15:** infraestructura 1.1/1.2 verificada (progress.md E002); vistas aún sin implementar. Solo este bloque fue autorizado. Polyfills Node y fetch son setupFiles separados y ordenados, con imports ES estáticos. MSW requiere globals configurables y transformación SWC de dependencias ESM bajo pnpm; customExportConditions usa Node en jsdom. Limpieza explícita DOM → cancelación/caché Query → estado inicial auth → handlers/mocks/timers. Zona del runner: America/Caracas; pruebas futuras de fechas fijarán su reloj explícitamente sin fake timers globales que interfieran con HTTP.

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

Disponibles: `make shell-web` y dentro `pnpm run typecheck` / `pnpm run lint`; `make deps-sync` regenera lock en Docker. Desde E002 están declarados `test`, `test:watch` y `test:coverage`; ejecución de `test` verificada en E002/E003. El reporte de coverage aún no se ejecutó ni acredita vistas. `test:e2e` y navegador siguen sin configurar. Instalar/sincronizar dependencias mediante container existente sin build; verificar disponibilidad y mounts, sin asumir instalación host ni imagen nueva.

Bootstrap 1.1/1.2 es prerrequisito ya verificado en E002/E003; las suites funcionales siguen pendientes de autorización. Después RED-GREEN-REFACTOR obligatorio, registrando comando/salida roja por comportamiento, verde y regresión. Fallo de import/runner no cuenta como RED.

## Progreso, entrega y riesgos

`tasks.md` checklist; `inventory.md` ruta→escenario→tarea→suite; `progress.md` append-only fecha/comando/resultado/evidencia; `state.yaml` estado de fases. Sólo marcar verificada con evidencia reproducible; planificación terminada ≠ tests terminados.

Orden: bootstrap, Inicio/cobro, altas restantes, medias. Slices autónomos con tests/docs <400 líneas; lock puede exceder presupuesto. `ask-on-risk`: resolver encadenamiento o excepción antes de apply futuro, no ahora.

Pendientes: política de borrado permanente de especialidades; contratos históricos de consultas/pagos; infraestructura navegador Alpine/DB sintética; compatibilidad efectiva runner/MSW/React. No inventar filtros/acciones para cumplir inventario. Rollback documental sin runtime; futuro revertir slice completo, sin cambios de datos ni refactor general.

## E007 — Corrección autorizada de errores V03

Consumir isError existente de TanStack Query en Inicio y selector. Error del resumen reemplaza bloque KPIs/alertas, incluso con caché previa, sin bloquear acciones rápidas. Errores de especialidades/doctores muestran role=alert y suprimen vacíos/datos obsoletos presentados como éxito; cambiar especialidad permite recuperación natural. Sin nuevas APIs, retry UI ni refactor compartido. Diez casos C ejecutados; E2E/cobro excluidos. Estado vigente en E007, párrafos iniciales conservan contexto de planificación.

## E009 — V01 componentes

Suite colocalizada LoginForm con hooks/services reales y MSW; solo next/navigation simulado. Fixture sintética pura separada; QueryClient/auth aislados por harness existente. isLoading distingue query deshabilitada, enabled usa access || webSlug; error login role=alert y guard mínimo de redirect local. Prueba credentials=include no demuestra cookie HttpOnly ni resolución headers server. No cambia backend/V02 ni infraestructura. 14 casos C/28 globales; evidencia E009, revisión independiente pendiente.

**Corrección E011:** E010 detectó falso positivo401. apiFetch acepta redirectOnUnauthorized (default true), retirado antes fetch; loginPOST opta false y conserva contexto para reintentar. Control protegido401 mantiene intento de navegación.15focales=14C+1controlAPI,29globales verdes; revisión pendiente.

## E013 — V04-A

MSW real para página/hooks/services y fixture pura agenda.fixture.ts; solo alta (bloque B) y cobro/PDF (2.2) simulados como límites explícitos. isError invalida disponibilidad cacheada; listado fallido oculta tabla engañosa y errores de mutación son visibles/reset al abrir selección. Sin dependencia/config nueva. Entrega aprobada `approved-chain-V04-two-slices`, cada bloque <=400 líneas nuevas, sin commits/PR ni excepción global.

## E015 — V04-B

Formulario, LookupCombobox y hooks/services reales con MSW; sin mocks de UI. Reutiliza fixtures puras y añade schedule.fixture.ts. Intervalos elegidos explícitamente (sin depender del reloj actual), con dos duraciones y cruce de medianoche. Defaults vacíos activan mensajes Zod de selección; disponibilidad fallida invalida caché y muestra alerta; POST fallido muestra alerta. Sin utilidades duplicadas, backend ni arquitectura nuevos.

## E019 — V05-B

PaymentForm/hooks/services/MSW y página padre reales; recibo/PDF/informe médico simulados como límites. Query error/fetch bloquean envío; cambio doctor limpia servicios en register.onChange; alertas visibles y eliminación de línea accesible. Prop opcional onPendingChange comunica isPending por efecto, setter estable del padre impide cierre externo; sin reset al unmount ni cambio de reglas financieras. Fecha datetime-local conserva conversión existente Caracas→UTC; no reutiliza cálculos de ConsultationPaymentForm2.2.

## E026 — V06-B

LabOrderForm/página/Modal/hooks/services reales y MSW;solo LabPaymentForm frontera C. Consultas existentes completas,sin migrar a lookup. isFetching/error de catálogos bloquean formulario y envío con selección cacheada;onPendingChange opcional con setter estable bloquea cierre padre,Cancelar disabled. Éxito notifica inmediatamente en vez de setTimeout1200ms:eliminar callback demorado evita afectar alta posterior;sin cambio DTO/regla financiera.

## E028 — V06-C

LabPaymentForm/padre/Modal/hooks/services reales con MSW;solo altaB frontera. Fieldset disabled y guard submit protegen envío;onPendingChange(pending,order) entrega snapshot al padre mediante callback estable. Mientras POST está pendiente padre renderiza mismo formulario/snapshot aunque detalle refetchee/falle/cambieestado,no solo protege Cancelar. Fuera del POST siguen gates A de frescura/ID/PENDING;éxito limpia snapshot/cierra. Sin API/DTO/regla financiera nueva.

## E030 — V07-A

Página/tabla/toolbar/hooks/services reales y MSW;solo ExpenseForm frontera B. Anulación usa onSuccess por llamada para cerrar solo al resolver;error visible conserva motivo. Guards comunes abrir/cerrar/submit impiden reset de mutación pendiente;reset solo fuera de pending al cerrar/abrir. Se alinea trim/min5 al DTO API confirmado,sin backend nuevo;listado fallido suprime caché engañosa.

## E032 — V07-B

ExpenseForm/página/Modal/hooks/services reales y MSW,sin mocksUI. Bs vacío usa setValueAs→undefined;Zod multipleOf0.01 valida precisión con casos0.29/6.17 sin aritmética financiera propia. Descripción2–200 y Bspositivo alineados DTO existente autorizado. Fieldset+guard submit/onPendingChange con setter estable impiden cierre padre pendiente;catálogo bloquea alta,estado Query/RHF conservado. Sin backend ni regla nueva.
