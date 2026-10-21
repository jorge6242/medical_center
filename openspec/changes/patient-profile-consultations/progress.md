# Progreso

**IMPLEMENTACIÓN COMPLETA —9/9 tareas verificadas con advertencias. Sin archivar, builds ni desplegar.**

## Registro inicial

- Autorizado: ficha unificada de paciente, edición explícita y consultas; excluidos informes/antecedentes de esta pantalla.
- Creados propuesta, requisitos, diseño, tareas y estado. El cambio anterior de pruebas queda intacto.
- Confirmados GET/PATCH paciente, filtro backend patientId, paginación y relación/índice existentes.
- Confirmado PATCH sin include de representantes y formulario sin precarga: corrección planificada, todavía pendiente.
- Confirmado selector `/patients/:id/consultations` limitado a PAID sin informe: debe quedar intacto.
- Sin archivos productivos modificados, pruebas ejecutadas, builds, commits ni despliegues en esta fase.
- Engram no disponible; este registro físico es la evidencia de planificación.

## Evidencias por unidad (completar durante apply)

| Unidad | Estado                   | RED / GREEN y comandos                                            | Diff / límites                                    |
| ------ | ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------- |
| 1.1    | Verificada independiente | 12/12 API; typecheck, lint focalizado y Prettier PASS             | 174 líneas apply; ver evidence/unit-1.1.md        |
| 1.2    | Verificada independiente | 7/7 web; typecheck y lint focalizado PASS                         | 250 líneas apply; ver evidence/unit-1.2.md        |
| 2.1    | Verificada independiente | 10/10; typecheck, ESLint y Prettier PASS; resto 2.2–3.2 pendiente | 387 apply +13 revisión =400; evidence/unit-2.1.md |

- P003: lectura 2.1 PASS parcial; cobertura 99.18% líneas/90% ramas; fuente de fecha civil, ACL y respuestas reales MSW revisada; no edición/historial ni E2E.
- P004: 2.2 formulario independiente 7/7 PASS, typecheck/ESLint y formato test/fixture PASS; cobertura fuente95.33%/representante91.62% líneas. Ver `evidence/unit-2.2.md` y checkpoint del informe; 4/9 tareas, integración pendiente.
- Hallazgo cross-slice: lectura 2.1 usa M/F pero Prisma devuelve MASCULINE/FEMININE/OTHER; falta etiqueta humana correcta y regresión con enum real. Coordinador asigna corrección a 2.3 antes cierre; 2.1 no acredita esa traducción real.
- P005: panel2.4 independiente6/6 PASS; TS/ESLint/Prettier exit0 y cobertura100% líneas/ramas. ACL y patientId/página/estado/snapshots/link comprobados; aún no montado en ficha. Evidencia `evidence/unit-2.4.md`; 5/9 tareas.
- P006: listado2.5 independiente6/6 PASS, TS/ESLint/formato PASS; links por paciente/ACL y alta/desactivación/eliminación HTTP preservados. Evidencia `evidence/unit-2.5.md`;6/9 tareas, no E2E ni cierre integrado.
- P007: integración2.3 independiente25/25 PASS (8 nuevos), TS/ESLint PASS, perfil100%líneas/94.87%ramas; lectura/edición/historymount y lateA→B comprobados. Enum sexo real corregido y probado; hallazgo P004 resuelto.7/9 tareas; regresión global en curso.

## P002 — verificación independiente de contratos

- Repetidos tests focalizados con cobertura, typecheck y ESLint: ambos workspaces exit 0; API Prettier exit 0.
- Inspeccionados fuente y assertions: filtros tenant, omisión de relaciones, representación completa, cache por ID y payload documento. Sin bloqueantes en estas dos unidades.
- Baseline API reparada 8/8 NO cuenta como RED funcional; RED semántico 11/12. Web RED de patientId distinguido de export ausente y reparación de wrapper.
- Cobertura de archivos completos parcial: API service 55.75%; consultations service 68.8%; hook patients 40.81%; service patients 82.92%. No afirmar cobertura total por siete tests de contrato.
- Informe: `verify-report.md`. Pantalla, permisos UI, formulario, navegación y regresión final siguen pendientes; no archivar.
- Documentación de verificación es unidad separada de apply, menor a 400 líneas; ningún cambio productivo/test por el verificador.
- Engram no disponible: informe y continuidad persistidos físicamente; sin builds, DB, commits ni despliegues.

## Riesgos y supuestos resueltos

- Se preserva 404 de inactivos y semántica singular/aditiva de representantes.
- No se incorpora borrado de email/fecha/sexo: vaciar conserva dato y se informa al usuario.
- Consultas conserva orden actual de registro; no implica orden cronológico de atención.
- Lectura del perfil no solicita informes, aunque GET paciente conserva su contrato con clinicalHistory.
- No bloqueo global de navegación; controles locales no descartan una mutación pendiente.
- Names doctor/paciente actuales; servicios/especialidades snapshot.
- Toda modificación productiva debe declararse; tests no son garantía absoluta de ausencia de regresiones.

## Próximo paso

Entrega revisable; archivo solo bajo autorización. Revisar advertencias de lint global ajenas y validar navegador/manual antes de despliegue si se requiere confianza integrada; no prometer ausencia total de regresiones.

## P008 — verificación final 3.1/3.2

- Docker web global:27 suites/223 tests PASS,0FAIL/skip,87.453s;44 casos nuevos frente a179 baseline. API patients12/12 PASS. Focal integrado25/25 PASS.
- Ambos typecheck y ESLint archivos tocados PASS; API lint global PASS. Web lint global FAIL5errores/6warnings; ignorando coverage generada,5errores/3warnings en reports/medical-records sin cambios. No se corrigen fuera de alcance ni se afirma lintglobal verde.
- Perfil final100%líneas/94.87%ramas; resto coberturas focalizadas y formatos heredados detallados en informe. Hallazgo sexo resuelto con regresiones reales; sin bloqueantes funcionales del alcance.
- Matriz final10/10 escenarios acreditados al nivel unitario/integraciónMSW; NO navegador ni DB real, manual financiero o garantía100%. No tablas/migraciones/dependencias/contratos clínicos eliminados.
- Unidad final de documentación separada3.1/3.2 menor400líneas; evidencia histórica por unidad preservada. Engram indisponible, continuidad física. No fuentes/tests editados por verificador, builds/commits/PRs/despliegues ni archivo ejecutado.
