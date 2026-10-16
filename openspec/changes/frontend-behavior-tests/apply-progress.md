# Apply progress — frontend-behavior-tests

> Estado documental E048,2026-10-16;alcances verificados E047:V01/V03/V04/V05/V06/V07/V08/V09/V10 componentes verificados;8/24principales completas,16pendientes+2opcionales,179tests/21suites=174C+1API+4infra. Honorarios54C(V08=10,V09=28,V10=16);sin E2E/rutas integrales,otros alcances requieren autorización.

**Impacto auditado:** [no son solo pruebas; 19 fuentes productivas modificadas](impact-summary.md).

## E046 — V10-B,2026-10-16

Generación invalida success/catch/finally al cambiar payoutId/unmount;error PDF local permite reintento. Captura snapshot válido al iniciar y mantiene una exportación ante refetch503/recuperación del mismo ID,sin iniciar otra sobre caché fallida. Panel/hooks/services/MSW reales;solo renderer/PDF importado/Blob/anchor/notificaciones simulados,sin contenido/layout/PDF real. URL lifetime existente intacta;Engram ausente. Honorarios54C ejecutadas(V08=10,V09=28,V10=16),pendiente revisión B;no otras vistas autorizadas por este avance.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.4.2|172/20suites|5fail/2pass antes fuente|7C:2snapshots/filenames,error/retry,carreras2/unmount2/refetch503|Trap finally2fail,guard restaurado;checks progressE046;revisión pendiente|

## E044 — V10-A,2026-10-16

Root subdivide lectura/PDF dentro mismo alcance automático,sin atribuir nuevo número de bloques al usuario. Panel/hooks/services/MSW reales;wrapper observador getDoctorPayout ejecuta HTTP real y permite esperar promesa vieja con Provider conservado. Error fresco/cacheado y null/ID ajeno no aparentan detalle;refetch bloquea descarga. Solo import PDF simulado,B pendiente. Engram ausente.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.4.1|163/19suites|5fail/4pass antes fuente|9C:3snapshots/VOIDED,404/503/null/IDajeno,HTTPtardío/cache/recovery|Formato/checks progressE044;revisión pendiente|

## E042 — V09-B2,2026-10-16

Generación de preview invalidada por selección/inputs/catálogos/unmount;success/catch/finally viejos no afectan generación actual. Error local y reintento;validez reutiliza schema/gates A2. Snapshot enviado al renderer,no prueba contenido/layout/PDF real;URL lifetime/revocación inmediata existentes no modificados. Mocks toBlob reinician colas por caso:clearAllMocks solo limpia llamadas. Engram ausente;V09 ejecutada28C pendiente revisión B2,V10 pendiente.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.3.2|153/18suites|9fail/1pass aislado antes fuente|10C:2doctores/snapshot,bancos,error/retry,6carreras,unmount,validación/cache503|Checks/budget progressE042;revisión pendiente|

## E040 — V09-B1,2026-10-16

Root subdividió B1/B2 técnicamente dentro del alcance automático autorizado,sin afirmar elección explícita del usuario de seis bloques ni excepción global. NewPage/form/hooks/services/MSW reales;router/PDF importado fronteras. Snapshot de pendientes durante POST y fieldset/guards conservan selección ante refetch vacío/503;error explícito conserva identidad,gate A2 vuelve al fallar. Hook existente invalida doctor-payouts y doctor-payout-pending,no config. Engram ausente;B2 pendiente.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.3.1|149/17suites|3fallan antes fuente:Cancelar navega,errorPOST oculto|3GREEN;4finales conCancelar válido caracterización,2HTTP exactos/nuevoID/cache/refetch503|Formato/checks progressE040;revisión pendiente|

## E038 — V09-A2,2026-10-16

Catálogos fallidos bloquean alta sin vacío/datos cacheados engañosos;lookup ofrece reintento mínimo local. Refetch bloquea submit incluso programático;sin doctor/pagos no POST. BCV mínimo0.0001/múltiplo0.0001 y referencia trim alineados DTO/service existentes autorizados;labels método/moneda asociados. Sin backend/B/PDF/E2E/Engram.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.2.2|141/16suites|7fallan antes fuente;label select bloqueaba validación,tras IDs7fail reales;loading adicional1fail/7pass|8C,errores frescos/cacheados,recuperación,POST inválido bloqueado y3tasas USD aceptadas|Checks/budget progressE038;A2 pendiente revisión|

## E036 — V09-A1,2026-10-16

Entrega aprobada cinco slices;solo A1 ejecutada. Formulario/lookup/hooks/services/MSW reales;PDF importado y observer nativo son fronteras simuladas. Refetch conserva intersección elegida;otro doctor reinicia selección. Labels BCV/referencia asociados localmente. Engram ausente;A2/B/V10 pendientes.
| Tarea | Baseline | RED | GREEN/triangulación | REFACTOR |
| --- | --- | --- | --- | --- |
|3.5.2.1|135/15suites|labels3fail/1pass→IDs;selección1fail/4pass tras esperar render nuevo|6C:POST/importes,doctor/cache/demora/intersección,cursorHTTP|Formato/checks progressE036;revisión pendiente|

## E034 — V08 listado/anulación

Entrega approved-chain-V08-V10-four-slices;soloV08 ejecutada. Página/hooks/services/MSW reales,prompt/router frontera navegador;sin filtros/modal nuevos,backend ni V09/V10 modificados. Errores query antes ocultos ahora alertan sin listado/vacío engañoso;motivo trim≥3 alinea DTO existente autorizado;pending bloquea otra anulación/reset,fallo visible permite segundoHTTP y refetchVOIDED. Engram ausente,persistencia física acumulativa.

| Tarea | Safety net               | RED                                                | GREEN/triangulación                                      | REFACTOR                                                               |
| ----- | ------------------------ | -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| 3.5.1 | 125tests/14suites reales | 7fallan/3pasan antes fuente;alertas/pending/motivo | 10C verdes;2IDs/importes,cache503,vacío,2HTTP+filaVOIDED | Formato tests/fixture,confirmación E034 progress.md;revisión pendiente |

Revisión E034:endurecida caracterización existente(error two→prompt cancelado one ANTES reintentar two),sin fuente nueva ni RED ficticio;logs /tmp/v08-review-{baseline,confirmation}.log.

## Corte histórico E023

- Completadas y verificadas: **1.1,1.2,2.1,2.3,3.2=5/24**;V01 subtarea3.1.1 verificada,3.1 abierta porV02. V03/V04/V05 componentes verificados E008/E016/E022.
- Pendientes:19/24principales;O.1/O.2 diferidas. V02,2.2,E2E y rutas integrales no acreditados ni autorizados para continuar ahora.
- Resultado vigente E022/E023:80/80tests,9suites,75C+1API+4infra;sin handles,TS/lint scoped/formato verdes. Lint global conserva5errores/3warnings ajenos.
- Cambios:bootstrap aislado y cobertura conductual real V01/V03/V04/V05 con correcciones mínimas autorizadas;fronteras PDF/navegador simuladas,backend financiero/E2E no acreditados.
- Entrega:bloques independientes y ledger administrativo E023 separado,sin commit/PR. Lock previo>2.000líneas visible;estrategia global pendiente,sin excepción de tamaño implícita.
- Próximo:esperar autorización para otras tareas;alcances actuales cerrados,no archivar cambio completo.
- Engram no disponible: no topic_key actualizado ni memoria simulada.
- E004: reconciliados metadatos de runner web/capacidades frontend, scripts disponibles y estado bootstrap; evidencia histórica E001–E003 preservada. Gate lint global sigue pendiente, sin cambios de aplicación ni nueva ejecución de tests.

## E005 — V03 parcial, acumulado con infraestructura

- Autorizado por usuario: iniciar V03 únicamente; bloque autónomo separado de infraestructura. Sin commit/PR ni ampliación a V04/cobro/E2E. Se mantienen 2/24 tareas completas, 2.1 parcial, 21 sin iniciar; opcionales fuera del denominador.
- Nueva suite `apps/web/src/app/(dashboard)/inicio/page.test.tsx`: seis casos de integración componente → hooks/services → MSW, datos sintéticos existentes. Mock único del formulario de cobro/PDF ajeno al alcance; Modal y SpecialtyConsultation reales. Cero cambios producción.
- Fix infra mínimo autorizado: mapping explícito @/ en Jest para ruta agrupada. Recreación solo web sin build y restore frozen-lockfile/ignore-scripts autorizados, lock/deps sin cambios nuevos.

| Tarea       | Safety net              | RED / excepción                                                                                                                                                                                             | GREEN / triangulación                                                                                                                                                                                      | REFACTOR                                                                             |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2.1 parcial | 2 suites/4 tests verdes | Caracterización existente: expectativa deliberada KPI999 falla frente a7; no bug RED ni producción modificada. Error alias/import no cuenta. Diagnóstico HTTP503 falla al exigir alerta (gap sin corregir). | Seis casos verdes: KPIs7/3/2/150,50 y variante12; alerta/vacío; carga diferida; búsqueda/no coincidencias; HTTP lazy/servicios; reset mismo doctor-ID en ambas especialidades; sin doctores/sin servicios. | Formato scoped y regresión completa10tests verdes; nada de producción refactorizado. |

- R07/S09 bloquea cierre2.1: HTTP503 produce estado Query error, pero UI no muestra error y aparenta0/sin alertas. Diagnóstico temporal retirado tras registrar fallo, no convertir bug en expectativa verde. Falta corrección autorizada y regresión persistente.
- Accesibilidad observada: Input de búsqueda muestra label sin asociación id/htmlFor; consulta por nombre accesible falla, se usa placeholder existente. No corregido por alcance. Evidencia y comandos completos en progress.md E005.
- Engram no disponible; persistencia física acumulativa, sin memoria simulada.

## E007 — Errores V03 corregidos con regresiones persistentes

Autorización explícita posterior a E006 permite cambiar solo Inicio. Se mantiene acumulado1.1/1.2 y ahora2.1 completa:3/24; 21pendientes. Root cause: isError ignorado y default[]/0 confundían HTTP fallido con éxito vacío; datos cacheados tampoco advertían fallo de actualización. isError ahora muestra alertas y oculta resultados engañosos, acciones rápidas intactas. Diez casos V03/14web verdes; revisión independiente pendiente. Shared Input y su gap accesible quedan intactos.

| Tarea          | Safety net               | RED real                                                                                      | GREEN / triangulación                                                                                       | REFACTOR                                                                                       |
| -------------- | ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 2.1 cierre R07 | 3 suites/10 tests verdes | Antes de fuente:4fallan/6pasan, falta role alert en503 stats/especialidades/doctores/refetch. | Después:10V03 verdes; success/vacío/carga previos siguen verdes; doctor se recupera cambiando especialidad. | Formato acotado, source printWidth100 del repo;14tests globales, typecheck/lint scoped verdes. |

Persistencia física E007 en progress/spec/design/tasks/inventory/state; Engram no disponible. Próximo sdd-verify V03, sin avanzar roadmap. Sin build/commit/deploy/deps.

## E008 — Verificación independiente posterior

La revisión pendiente de E007 quedó ejecutada:10V03/14global verdes, typecheck/lint/formato scoped verdes. Tarea2.1 verificada en alcance componentes;0CRITICAL,2WARNING históricos y1SUGGESTION no bloqueante. Resultado detallado verify-report.md/E008 y progress.md/E008;3/24 completas,21pendientes,full_change_verified=false. Ninguna autorización para cobro/V04/E2E ni ruta completa acreditada. Las referencias anteriores a revisión pendiente son historia previa a este evento.

## E009 — V01 componente, acumulado con infraestructura/V03

Completadas1.1/1.2/2.1 y subtarea3.1.1; 3.1 sigue abierta por V02, total3/24. V01 autorizada como slice autónomo <400 líneas nuevas, sin commits/PR; roadmap/lock preexistentes separados. Estado: implementada pendiente sdd-verify; E008/V03 preservada. Nuevas fuentes: login-form.tsx/use-login.ts; suite login-form.test.tsx y fixture login.fixture.ts. MSW real, sin mocks de auth hook/service. Engram no disponible: persistencia física, sin memoria simulada.

| Tarea     | Safety net             | RED real / caracterización                                                                                                                              | GREEN / triangulación                                                                                                                                          | REFACTOR                                                                               |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 3.1.1 V01 | 3suites/14tests verdes | 7fallan/7pasan antes de fuente: spinner sin contexto, access vacío, alerta401 y4redirects. Otros7 caracterización inicialmente verde, no RED inventado. | 14V01 verdes: contexto access/slug/ausente/rechazado, validación/payload/credentials, pendiente/dobleenvío/cache, error/reintento y redirects local/inseguros. | Formato acotado y narrowing TS; 4suites/28tests verdes, typecheck/lint/formato scoped. |

Raíces: Query isPending también para disabled; ?? conserva access vacío; error no accesible como alert; redirect query sin validación. Guard local aprobado antes de fuente. Primer RED8fallos incluía cache fixture gcTime0 (no bug producción), corregida con gcTimeInfinity por clave antes del RED definitivo7fallos. No se modifica backend401: jsdom no navega, su error esperado se captura y valida; no acredita navegación real. V02/server headers/cookies/E2E excluidos. Progreso/comandos E009; próximo sdd-verify V01, no otras vistas.

## E011 — V01 corregida tras revisión bloqueante E010

E009 fue parcial por falso positivo401: jsdom no navegaba, pero navegador perdería contexto. Solo loginPOST desactiva redirectOnUnauthorized; apiFetch default conserva protección y retira opción antes fetch. Suite ahora14C+1control API/29globales;3.1.1 implementada pendiente reverificación,3.1 abiertaV02 y3/24completas. Revisión E010 permanece histórica, no se declara aprobada. Engram ausente.

| Tarea               | Safety net    | RED                                                                                                        | GREEN / triangulación                                                                                                               | REFACTOR                                                  |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 3.1.1 corrección401 | 28verdes E010 | Antes fuente1failed/14passed al prohibir navegación; recheck1failed guardado /tmp/v01-401-red-recheck.log. | 15focal/29global verdes; login401 sin navegación, reintento mismo token; protegido401 aún intenta redirigir; opción no llega fetch. | Formato; typecheck/lint/prettier scoped/diffcheck verdes. |

Slice correctivo independiente <150líneas; no suma alcance/PR anterior ni autoriza roadmap. Fuentes api.ts/auth.service.ts/test login; progreso E011. Wrapper server/cookies/E2E yV02 pendientes. El raw /tmp/v01-red.log deE009 no contiene7/7; solo salida herramienta histórica lo reportó. Próximo sdd-verify.

## E013 — V04-A implementada; B pendiente

Acumulado1.1/1.2/2.1 y3.1.1 preservado;3/24 completas,3.2 abierta con3.2.1 implementada pendiente revisión y3.2.2 autorizada pendiente. Entrega scoped `approved-chain-V04-two-slices`, sin aprobar roadmap/lock preexistente.17C Agenda/46global verdes; formulario de creación simulado SOLOA, cobro2.2/E2E excluidos. Engram ausente; OpenSpec físico.

| Tarea       | Safety net             | RED real / caracterización                                                                                                           | GREEN / triangulación                                                                                               | REFACTOR                                                                                             |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 3.2.1 V04-A | 4suites/29tests Docker | Antes fuente6fallan/10pasan: alertas listado/disponibilidad/mutaciones ausentes;10 caracterizaciones inicialmente verdes no son RED. | 17C verdes incluyendo segundo ID/PAID, errores→reintento, carga/vacío/filtros, Caracas UTC medianoche y conflictos. | Formato scoped tests/fixture;fuente legacy sin formato masivo.46global/typecheck/lint scoped verdes. |

Raíces: fallbacks[] confundían error con vacío, disponibilidad cacheada ignoraba isError, errores de mutación no se presentaban. Fuente mínima agenda/page.tsx; suite colocada y fixture pura separada. Evidencia/comandos/raw logs en progress.md/E013. V04 NO completa hasta B y revisión; verify-report independiente no editado.

## E015 — V04-B implementada, pendiente revisión independiente

Completadas 1.1/1.2/2.1/3.2 = 4/24; subtarea V01 3.1.1 preservada, 3.1 sigue pendiente por V02. A verificada E014; B implementada (8C), V04 suma 25C y web 54 casos. Cobro 2.2/E2E/ruta completa excluidos. Persistencia OpenSpec, Engram ausente.

| Tarea       | Safety net      | RED real / caracterización                                                                                                            | GREEN / triangulación                                                                                                                                             | REFACTOR                                                                |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 3.2.2 V04-B | 46 tests Docker | Antes fuente: 4 fallan/4 pasan; mensajes Zod con undefined y alertas disponibilidad/POST ausentes. Caracterizaciones verdes honestas. | 8C verdes; selección/servicios requeridos, dos intervalos, segundo doctor, conflicto/carga/error inicial y cacheado, POST pendiente/rechazo/segundo HTTP exitoso. | Solo formato tests/fixture; 54 globales, TS/lint scoped/formato verdes. |

Causas: IDs iniciales undefined no usaban mensajes de selección; disponibilidad cacheada ignoraba error; fallo POST carecía de alerta accesible. Fuente mínima únicamente schedule-consultation-form.tsx; A y revisión E014 intactas. Evidencias en progress.md/E015. Próximo sdd-verify B; no otras vistas autorizadas.

E016 posterior: revisión independiente B aprobada; A+B25C/54globales,TS/lint/formato scoped verdes;4/24principales completas,3.1abiertaV02,full_change=false. Pendientes de revisión en E015 son historia previa; resultado actual verify-report.md/E016. Sin autorización para otras vistas/cobro/E2E.

## E017 — V05-A listado, ajustes y anulación

Entrega autorizada `approved-chain-V05-three-slices`, solo A implementada pendiente revisión; B/C autorizadas pendientes, 2.3 abierta y 4/24 principales completas. E016/V01/V03/V04 preservadas. Nueve casos C nuevos; formulario/recibo/PDF/informe médico son límites simulados, no cobertura de sus internos. Engram ausente; persistencia física.

| Tarea       | Safety net             | RED real / caracterización                                                                       | GREEN / REFACTOR                                                                                                                                    |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.1 V05-A | 54tests/6suites Docker | 4fallan/4pasan antes fuente: alertas listado/ajuste ausentes y anulación no bloquea doble envío. | 9C verdes, dos IDs anulación, segundo POST/payload y listado refetch; fixture tipada corregida tras typecheck. Evidencia/comandos progress.md/E017. |

Raíces: errores de query/mutaciones ignorados e isPending de anulación no consumido. Cambios mínimos página/columnas; sin contrato financiero nuevo. Anulación API no requiere motivo; S06 aplica a egresos/liquidaciones. PaymentForm B no usa payment-calculations (pertenece a2.2 excluida). Próximo sdd-verify A antes de B; no build/deps/commit/deploy/DB.

E017 revisión correctiva — 2026-10-16: error de ajuste de pay-two contaminaba modal de pay-one. Regresión permanente falló antes de fuente (1fail/9pass, `/tmp/v05-a-review-red.log`); reset de mutación al abrir/cerrar elimina alerta vieja. Segundo HTTP usa pay-one y cierra modal exitosamente. Suite A ahora10C; tarea2.3 sigue abierta B/C. GREEN y checks finales en progress.md; E018 reservado revisión independiente.
E017 segunda corrección — 2026-10-16: reset durante POST pendiente desvinculaba isPending y permitía duplicar ajustes. RED1fail/9pass real, guards de apertura/cierre/submit y Cancelar disabled conservan contexto sin cancelar HTTP; caso existente ahora intenta Cancelar/Escape/reabrir mismo/otro pago y exige1POST hasta resolver. Tabla TDD E017 extendida por esta evidencia; detalle/logs en progress.md, revisión E018 pendiente.

## E019 — V05-B PaymentForm real

A verificada E018 preservada; B implementada pendiente revisión, C autorizada pendiente. 2.3.2 completa por ejecución, padre2.3 abierto y4/24 principales intactas. Engram ausente; sin build/deps/commit/deploy/DB.

| Tarea       | Safety net             | RED real / caracterización                                                                                                                                                         | GREEN / REFACTOR                                                                                                                              |
| ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.2 V05-B | 64tests/7suites Docker | 7failed/1passed antes fuente, logs E019; error/carga catálogos, servicios heredados, Cancelar pendiente y eliminación inaccesible. Validación existente ya verde, no RED ficticio. | 8C verdes: dos doctores, líneas/remoción, payload/UTC, vacío/error cacheado, segundoPOST y callback/invalidation; checks finales progress.md. |

Fuentes mínimas formulario y guard del modal padre explícitamente autorizado. Catálogos HTTP fallidos ya no aparentan servicios vacíos; servicios de otro doctor no se envían. POST pendiente conserva formulario pese a Cancelar/Escape, sin cancelar petición; rechazo muestra alerta. Reintento conserva generación existente de idempotencyKey por intento: NO demuestra deduplicación de fallos ambiguos backend. Próximo sdd-verify B antes de C.

## E021 — V05-C recibos/descarga

A/B verificadas E018/E020 preservadas; C implementada pendiente revisión, 2.3 completa por ejecución y5/24 principales. Engram ausente; persistencia física sin build/deps/commit/deploy/DB.

| Tarea       | Safety net             | RED real / caracterización                                                                                                                                             | GREEN / REFACTOR                                                                                                       |
| ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2.3.3 V05-C | 72tests/8suites Docker | 4failed/2passed antes fuente: HTTP/PDF silenciosos y carga sin estado accesible. Selección/snapshot y guard de carrera existentes son caracterización, NO bugs nuevos. | 6C verdes: dos IDs/snapshots, HTTP/PDF/reintento, pendiente sin duplicación y carrera; raw/checks E021 en progress.md. |

Modal/HTML/servicio/API reales; solo PDF/navegador y formularios ajenos simulados. Wrapper observador autorizado ejecuta getReceipt real sin sustituir datos para esperar su promesa; rerender preserva Provider/client para no remontar modal. Mutación temporal sin guard demuestra sensibilidad; guard original restaurado. URL lifetime previo no modificado: revocación inmediata puede invalidar carga de ventana; no se inventó timeout ni se acredita gestión de esa vida útil. Tarea2.2/E2E/backend idempotencia/PDF real siguen fuera. Próximo sdd-verify C y alcance V05.
E021 corrección de revisión — 2026-10-16: PDF pendiente de A podía mostrar error o abrir archivo de A tras seleccionar B. RED2fail/6pass previo; generación invalidada al cerrar/cambiar descarta success/catch/finally viejos y limpia pending de nueva selección. Dos regresiones inician PDF-B antes de resolver A y exigen que B siga bloqueado hasta su propia resolución. C ahora8C/V05total26, pendiente revisión E022; evidencia progress.md.

E023 consolidación posterior:revisión independiente C/V05 aprobada E022;75C+1API+4infra=80globales,26C V05,5/24principales. 2.3 cerrada en alcance C;3.1abiertaV02,2.2/E2E/rutas integrales pendientes. State/config vigentes E023;frases previas de revisión pendiente son historia. Ledger administrativo medido aparte de A379/B367/C383;no nuevo código ni avance automático a otras vistas.

## E024 — V06-A implementada, pendiente revisión

3.3.1 ejecutada9C/89globales;3.3 abierta B/C,5/24 principales intactas. Entrega V06/V07 cinco bloques autorizados,solo A ahora;sin E2E/cobro real ni nueva ruta integral verificada. Detalle/error/refetch/ID/estado protegidos;fuente mínima,fixtures puras,MSW real. Evidencia/comandos progress.md E024;Engram ausente.

| Tarea       | Safety net     | RED                                              | GREEN / triangulación                                          | REFACTOR                                                           |
| ----------- | -------------- | ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3.3.1 V06-A | 80/80 baseline | 6fail/3pass antes fuente,alertas/caché/ID/estado | 9/9focal,89/89global;2IDs/2estados/retry2HTTP/caché503/filtros | Formato testfixture;TS/ESLint scoped verdes,sin refactor adyacente |

## E026 — V06-B ejecutada, pendiente verificación

A verificada E025 intacta;B6C/95globales,3.3.2 ejecutada y3.3 abierta C,5/24principales. MSW+formulario/padre reales;solo C frontera. Catálogos fallidos/cargando no son vacío ni permiten alta cacheada;POST conserva contexto y reintenta2HTTP,éxito sin callback demorado. Sin E2E/PDF/cobro real/Engram;detalle progress.md E026.

| Tarea       | Safety net     | RED                                               | GREEN / triangulación                                                               | REFACTOR                                                               |
| ----------- | -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 3.3.2 V06-B | 89/89 baseline | 6fail antes fuente:alertas/carga/pending/callback | 6C/95global;2catálogos cacheados/selección test removido/2HTTP retry/alta siguiente | Formato testfixture,TS/ESLint/Prettier CHECK verdes,sin refactor ajeno |

## E028 — V06-C ejecutada, pendiente revisión

A9C/B6C verificadas E025/E027;C7C ejecutadas,22C V06 y102globales. 3.3/3.3.3 marcadas por ejecución,6/24principales;verificación C pendiente y full_changefalse,0rutas integrales. Snapshot pendiente en padre mantiene mismo formulario/IDs ante refetchPAID/503 y evita segundoPOST;fuera del cobro conserva gates A. Fallo visible/retry2HTTP/listado actualizado;sin backend financiero ni E2E/PDF/Engram.

| Tarea       | Safety net     | RED                                                                        | GREEN / triangulación                                     | REFACTOR                                                               |
| ----------- | -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| 3.3.3 V06-C | 95/95 baseline | 4fail/3pass antes fuente:remove inaccesible,pendingCancel/refetch desmonta | 7C/102global;2IDs/USD-VES/2refetches/2POST retry+filaPAID | Formato test,TS/ESLint scoped/Prettier CHECK verdes,sin refactor ajeno |

## E030 — V07-A ejecutada, pendiente revisión

3.4.1 ejecutada11C/113globales;3.4 abierta B,6/24principales completas,V06 verificada E029 intacta. Snapshot de detalle y anulación ID/motivo correctos;POST no cierra antes de éxito,guards evitan reset pendiente/error visible y retry real2HTTP+filaVOIDED. min5trim alineado a DTO API con autorización,sin backend ni ExpenseFormB/E2E/Engram.

| Tarea       | Safety net       | RED                                                        | GREEN / triangulación                                                 | REFACTOR                                                                        |
| ----------- | ---------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3.4.1 V07-A | 102/102 baseline | 5fail/6pass antes fuente:listado/min5/pending-cierre/error | 11C/113globales;2IDs/3motivos inválidos/retry2HTTP+filaVOIDED/detalle | Formato testfixture,TS/ESLint scoped/Prettier CHECK verdes,sin fuente adyacente |

E030 revisión:moneda Bs en detalle corregida después de RED1fail/10pass real;antes formatUsd etiquetaba amountBs como dólares y el test lo caracterizaba mal. Ahora formatBs,USD intacto;focal11/global113/checks verdes,progress.md conserva diagnóstico y corrección. A pendiente E031,B no iniciada.

## E032 — V07-B ejecutada, pendiente revisión

A11C verificada E031;B12C ejecutadas,V07=23C/global125. 3.4/3.4.2 marcadas por ejecución,7/24principales(6 verificadas),fullchangefalse/0rutas integrales. Bs opcional vacío→undefined y validaciones DTO existentes alineadas;catálogo/POST/error/retry2HTTP/refetchfila y alta siguiente limpia comprobados con UI/HTTP reales. Sin backend/E2E/Engram;cinco bloques ejecutados,última revisión pendiente.

| Tarea       | Safety net       | RED                                                                                                  | GREEN / triangulación                                                      | REFACTOR                                                                    |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 3.4.2 V07-B | 113/113 baseline | 8fail/4pass antes fuente:BsNaN/min2/max/precisión/Bspositivo/catálogos;caso pending bloqueado porNaN | 12C/125global;límites2/200,0.29/6.17,catálogo cacheado503,2POST+fila nueva | Formato testfixture,TS/ESLint scoped/Prettier CHECK verdes,sin fuente ajena |
