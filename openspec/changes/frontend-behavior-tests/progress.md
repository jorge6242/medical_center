# Progreso y evidencia

> **IMPLEMENTACIÓN NO INICIADA — aclaración del 2026-10-14.** La planificación está completa, pero no se inició el bootstrap ni la implementación de pruebas de este cambio. No hay tareas de implementación completadas ni ejecuciones acreditadas. Esta actualización es documental y no autoriza iniciar implementación.

**2026-10-11: planificación documentada; implementación pendiente.** 24 tareas comprometidas sin completar, 2 opcionales diferidas. 29 vistas recomendadas pendientes; 0 verificadas por este cambio. No se ejecutaron suites, instaló tooling ni modificó aplicación. No representa porcentaje de cobertura ni afirma commit/tracking Git.

## Estados y bloqueos

`pendiente` → `en-curso` → `implementada-sin-verificar` → `verificada`; `bloqueada` conserva causa/evidencia y no cuenta como completada. Archivos escritos o tests backend no verifican vistas. Bootstrap 1.1/1.2 bloquea ejecución frontend; 1.3 bloquea expectativas de V25, V18/V19 y cualquier discrepancia detectada en pacientes. No declara que esas tareas estén implementadas.

Siguiente slice mínimo: **1.1**, después de autorizar implementación y resolver estrategia de entrega. Sin build; comprobar primero container/mounts. Estimaciones en tasks.md no garantizan tamaño real. Cada dominio tiene un responsable futuro por slice; no compartir edición simultánea de wrappers o helpers. 2.1 y 2.2 preceden restantes altas; 3.x/4.x pueden paralelizarse en dominios separados tras 1.2, respetando 1.3. 3.5, 4.2, 4.3 y 5.1 se subdividen por formulario/listado/detalle o infraestructura/flujo si no caben en una sesión o 400 líneas, manteniendo IDs.

## Criterios concretos por tarea

La fuente y objetivo exactos están en inventory.md; suites futuras colocalizadas y archivo definitivo registrado en cada evento. No exigir un test por ruta.

| Tarea   | V / R / S                                | Aceptación mínima específica                                                                                                                             |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1–1.2 | R01/S01                                  | Smoke render, alias, user-event/MSW; petición inesperada falla; segundo test sin caché/auth/handlers del primero                                         |
| 1.3     | V25/V16/V18/V19, R09/S11                 | Contrastar acciones de pacientes/especialidades con persistencia; consultas con specs históricas/API; registrar decisión o bloqueo antes de expectativas |
| 2.1     | V03, R03/S04                             | Fixture KPIs conocida coincide; cambiar especialidad elimina selección de doctor incompatible                                                            |
| 2.2     | V03/V04, R03/S04                         | Abrir cobro de consulta A no envía ID B; inválido no request; éxito invalida caché acordada                                                              |
| 2.3     | V05, R04/S05                             | Pago inválido no envío; ajuste/anulación usan pago seleccionado y payload vigente; recibo recibe su ID                                                   |
| 3.1     | V01/V02, R02/S02/S03                     | Login envía slug resuelto; rechazo no éxito; token ausente y contraseñas distintas impiden activación                                                    |
| 3.2     | V04, R03/S04                             | Fecha transformada según contrato/zona; turno seleccionado y estado determinan acciones y payload                                                        |
| 3.3     | V06, R04/S05                             | Orden válida envía exámenes seleccionados; pago usa orden elegida, no otra fila                                                                          |
| 3.4     | V07, R04/S05/S06                         | Form inválido no envía; válido conserva campos; motivo vacío no anula; rechazo no confirma éxito                                                         |
| 3.5     | V08/V09/V10, R04/S05/S06                 | Selección consultas define IDs enviados/importes recibidos; detalle/recibo misma liquidación; motivo vacío no anula                                      |
| 3.6     | V11, R06/S08                             | Filtro/pestaña determina parámetros y dataset entregado a exportador, no afirmar PDF/Excel correcto por mock                                             |
| 3.7     | V12/V13/V14, R05/S07                     | Un test por formulario compartido; roles asignables, inválido sin request, precarga/edición del usuario A                                                |
| 3.8     | V15, R05/S07                             | Config inválida no request; válida envía campos del formulario, muestra resultado real                                                                   |
| 4.1     | V16/V17, R05/S07,R06/S08                 | Schema/form propios válidos/inválidos; filtro/acción usa paciente elegido; historial corresponde ID solicitado                                           |
| 4.2     | V18/V19/V20, R06/S08                     | Filtros vigentes, consulta A al crear informe, detalle solicitado y datos de descarga del informe seleccionado                                           |
| 4.3     | V21/V22/V23/V24, R05/S07                 | Filtrado/selección; alta inválida sin envío; editar conserva ID/split; verificar/invitar/desactivar doctor elegido                                       |
| 4.4     | V25, R05/S07                             | Precio válido/inválido y edición especialidad-ID; acción de persistencia sólo con contrato confirmado                                                    |
| 4.5     | V26, R05/S07                             | Precio/datos válidos y acción sobre examen seleccionado, no otra fila                                                                                    |
| 4.6     | V27, R06/S08                             | Filtro retorna registros/precios del dataset recibido, no cálculo inventado                                                                              |
| 4.7     | V28, R05/S07                             | Inválido no guarda; guardar/verificar conserva perfil y estado recibido                                                                                  |
| 4.8     | V29, R06/S08                             | Filtros llegan a servicio; error distinto de vacío; detalle del evento seleccionado                                                                      |
| 5.1     | V01/V03/V05/V07/V32–V34, R01/R08,S01/S10 | Entorno sintético y navegador real; sesión/contexto, cobro/anulación y documento correcto; redirects auxiliares sin suites propias                       |
| 5.2     | Todos, R10/S12                           | Cruce ruta→escenario→tarea→suite→ejecución sin checkbox completado sin evidencia                                                                         |
| O.1/O.2 | V30/V31, R08/S10                         | Diferidas; no sumar a 24 tareas/29 vistas comprometidas                                                                                                  |

**R07/S09 aplica a cada tarea funcional:** carga, vacío, error y no-encontrado donde exista ese estado. Si código no distingue un estado requerido, registrar fallo/gap, no hacer pasar snapshot del bug ni introducir comportamiento inventado; corregir sólo bajo alcance autorizado. Unitarias de lógica propia + componentes para interacciones; E2E complementaria no acredita todas las vistas automáticamente. DataTable compartida se prueba una vez si hace falta, configuración/acción de dominio por suite. No recalcular split/impuestos autoritativos del API.

## Protocolo de ejecución futura

1. Bootstrap: configurar runner antes de exigir RED funcional. Mostrar una aserción conductual deliberadamente falsa que falle y su versión correcta que pase: **sensibilidad del harness**, no bug/TDD de producción. Error de import/runner no cuenta. Registrar excepción de bootstrap/characterización honestamente.
2. Tras bootstrap: caso RED por comportamiento ausente/incorrecto → cambio mínimo GREEN → REFACTOR y regresión. Para caracterización de comportamiento existente que ya pasa, registrar GREEN inicial y sensibilidad de aserción/control o mutación temporal revertida; no inventar RED ni modificar aplicación sólo para fabricar un fallo. Bugs detectados usan RED real y autorización de corrección.
3. Docker únicamente: `make shell-web`; adentro `pnpm run typecheck` / `pnpm run lint`. Scripts `test`, `test:coverage`, `test:e2e` son **propuestos, inexistentes hoy**; registrar comando exacto después de habilitarlos. Sin builds. Dependencias/lock mediante container del proyecto y flujo `make deps-sync`, no host Node ni docker run aislado.
4. Marcar `[x]` sólo con todos los criterios/scenarios aplicables reproduciblemente verdes, lint/typecheck y regresión relevante; guardar salidas RED/GREEN/refactor o excepción explícita. Un resultado bloqueado/fallido conserva historial.
5. Actualizar misma revisión: checkbox tasks.md; IDs/estado y enlaces evidencia en inventory.md; nuevo evento aquí; state.yaml con fase real. Suite compartida referencia múltiples V-ID; verificar cada comportamiento antes de avanzar esas filas. Si divergen archivos, no proclamar cierre: registrar inconsistencia y reconciliar con evidencia. Ref Git opcional sólo si existe realmente.

## Registro append-only

No borrar ni sustituir eventos; correcciones se agregan y referencian evento anterior. Cabecera/resumen puede actualizarse, registro permanece histórico. Guardar salidas reproducibles sin PII/credenciales.

### E001 — 2026-10-11 — Planificación

- Estado: planificación completada; implementación pendiente.
- Archivos: tasks.md y progress.md; fuentes proposal.md, inventory.md, design.md, specs/frontend-behavior-testing/spec.md.
- Tareas: 1.1–5.2 pendientes; O.1/O.2 diferidas. Rutas: V01–V29 pendientes; V30/V31 diferidas; V32–V34 sin suite propia.
- Evidencia: lectura estática de artefactos; no comandos Docker de tests, no resultados RED/GREEN, no ref Git declarada.
- Bloqueos: bootstrap frontend, contratos 1.3, estrategia entrega antes de apply; autorización actual sólo documentación.

### Plantilla para agregar evento (copiar, no marcarlo ejecución)

```text
Evento: E___; fecha: YYYY-MM-DD; responsable:
Tarea: ; requisito/escenario: R__/S__; vistas: V__
Fuente/objetivo: ; suite/archivo definitivo:
Estado previo → nuevo: ; criterios cubiertos/pendientes:
Docker: container/entrada y comando exacto:
RED: salida/exit/evidencia (o excepción razonada bootstrap/characterización):
GREEN: salida/exit/evidencia:
REFACTOR/regresión/lint/typecheck: comandos/resultados:
Bloqueo/gap/decisión: ; siguiente acción:
Evidencia almacenada/link: ; ref Git (opcional, real):
Actualizados: tasks.md / inventory.md / state.yaml
```
