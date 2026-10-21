# Unidad 2.3 — edición integrada

Estado: implementada y verificada focalmente. Pendiente regresión global y cierre por orquestador.

## Cambios y contratos

- Lectura inicial, botón Editar datos solo `patients:update`, formulario RHF real y Guardar/Cancelar existentes.
- Snapshot local al abrir edición: refetch (incluido error) no desmonta ni sobrescribe borrador; cancelar descarta y nueva sesión monta defaults actuales.
- Éxito PATCH vuelve a lectura; hook real invalida lista/detalle. Fallo conserva borrador y permite reintento.
- Guardar/Cancelar bloqueados pending en formulario; navegación propia a Pacientes se muestra solo en lectura. No bloqueo de navegación global/browser.
- Montaje con key por ID: respuesta tardía del paciente A no cierra edición de B. Sin callback pendiente adicional ni cambios al formulario.
- Historial real PatientConsultations montado en lectura con ID; permiso independiente conservado. Sin informes/antecedentes.
- Corregidas etiquetas de enum real MASCULINE/FEMININE/OTHER; fixture heredada `F` corregida a FEMININE, sin compatibilidad inventada.

## STRICT TDD

| Unidad | Safety net               | RED                                               | GREEN / triangulación                                                                                                   | Refactor                                       |
| ------ | ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2.3    | 17/17 lectura+formulario | 4 FAIL por acciones/sexo ausentes, 1 PASS permiso | 8 nuevos PASS: sexo real, ACL, cancelar/guardar, refetch/error/retry/pending, late A/B, enum alternativo e historial ID | Snapshot mínimo, sin abstracciones adicionales |

## Ejecución real

Docker compose existente `web`; sin host Node:

- `pnpm run test --runInBand patient-profile-edit.test.tsx` → RED 4 FAIL/1 PASS.
- Primer GREEN: lista inactiva GC=0 desaparecía; fixture de cache corregida con QueryObserver retenido, no cambio productivo para falsear el test.
- `pnpm run test --runInBand patient-profile-edit.test.tsx patient-profile.test.tsx patient-form.test.tsx` → **25/25**, tres suites.
- `pnpm run typecheck`, ESLint tres fuentes/test tocados → PASS.
- Prettier check profile y nuevo test → PASS. Log local `/tmp/unit23-final.log`.
- Guides Next instaladas releídas: server-and-client-components y forms (01-app); se conserva cliente interactivo + NestJS externo, no Server Actions.

## Presupuesto y límites

Diff incremental 2.3: profile 32+6, fixture test legado 1+1, nuevo test 210, evidencia 30 = **280 líneas**; reserva 40 ⇒ 320/400.
Engram no disponible; continuidad física. Tasks/progress/state principales no se editan por ownership. Sin builds, DB, commits ni despliegues. Suite global y navegación de listado son otras unidades pendientes.
