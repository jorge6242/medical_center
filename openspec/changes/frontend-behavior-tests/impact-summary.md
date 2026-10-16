# Impacto del avance frontend

## Conclusión — E048, 2026-10-16

**No son solamente pruebas unitarias: el diff actual modifica 19 archivos productivos del frontend.** Hay correcciones de comportamiento, además de pruebas y herramientas de desarrollo. Los flujos válidos ejercitados siguen pasando; eso NO garantiza impacto cero ni ausencia de regresiones en toda la aplicación.

Esta auditoría solo actualizó documentación. No agregó casos ni cambió código, dependencias, infraestructura o datos. La última verificación independiente de alcances sigue siendo [E047](verify-report.md#e047--v10-b-y-cierre-honorarios-v08v09v10-2026-10-16); la repetición fresca está registrada en [E048](progress.md#e048--2026-10-16--auditoría-de-impacto-y-actualización-documental).

## Avance comprobado

- **179 casos verdes / 21 archivos de suite:** 174 casos de componente/integración, 1 control del cliente API y 4 controles de infraestructura.
- **8/24 tareas principales completas**, 16 pendientes y 2 opcionales diferidas. Las subtareas no aumentan el denominador.
- **9 vistas con alcance de componente verificado; 0 rutas integralmente verificadas.** No equivale a nueve E2E ni a un porcentaje de cobertura global.

| Vista                               | Alcance                                            | Casos de componente |
| ----------------------------------- | -------------------------------------------------- | ------------------: |
| V01 `/login`                        | Formulario y contexto de acceso                    |                  14 |
| V03 `/inicio`                       | KPIs, errores y selección especialidad/doctor      |                  10 |
| V04 `/agenda`                       | Página y formulario de agenda                      |                  25 |
| V05 `/pagos`                        | Página, formulario y recibo                        |                  26 |
| V06 `/laboratorio/ordenes`          | Página, alta y cobro                               |                  22 |
| V07 `/egresos`                      | Página, anulación y alta                           |                  23 |
| V08 `/liquidaciones-doctores`       | Listado y anulación                                |                  10 |
| V09 `/liquidaciones-doctores/nueva` | Selección, validación, registro y preview          |                  28 |
| V10 `/liquidaciones-doctores/[id]`  | Detalle y frontera de descarga                     |                  16 |
| **Total**                           | **19 suites de negocio; más 2 de infraestructura** |             **174** |

Estas pruebas renderizan componentes reales con hooks y servicios; MSW reemplaza HTTP con respuestas sintéticas controladas. No son exclusivamente unitarias de funciones aisladas. Las pruebas de PDF simulan renderer/Blob/navegador: comprueban selección, props, estados y callbacks, no el documento visual real.

## Tres tipos de cambio en el diff

| Tipo                    | Archivos o evidencia                                                                                                                                               | Impacto                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Casos y datos de prueba | 21 archivos `*.test.tsx`; fixtures y handlers bajo `apps/web/src/test/`                                                                                            | No son pantallas productivas. Casos verifican UI, payloads, errores y concurrencia con HTTP simulado.                                                                                              |
| Harness y desarrollo    | `apps/web/jest.config.ts`, setup/polyfills/render/server; scripts/devDependencies de `apps/web/package.json`; mounts de `docker-compose.dev.yml`; `pnpm-lock.yaml` | Permiten Jest/jsdom/RTL/MSW. El lock compartido también cambia resolución de tooling; no se debe afirmar que el entorno quedó idéntico. No se instalaron/recrearon contenedores en esta auditoría. |
| Código productivo       | **19 archivos existentes** de `apps/web/src/`, enumerados abajo                                                                                                    | Correcciones visibles de validación, carga/error, selección, pending, navegación y descarga. También hay cambios de accesibilidad (`id`, `role`, `aria-label`).                                    |

## Qué cambia en el uso regular

Rutas abreviadas: `D/` = `apps/web/src/app/(dashboard)/`, `F/` = `apps/web/src/features/`. Las filas agrupan exactamente los 19 archivos productivos modificados contra HEAD.

| Archivos productivos                                                              | Comportamiento cambiado                                                                                                          | Consecuencia esperada                                                                                                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/app/(auth)/login/login-form.tsx`                                    | Contexto con `access` vacío usa fallback; carga/alerta diferenciadas.                                                            | Acceso y feedback dejan de depender de un contexto vacío o un estado pending inactivo.                                                           |
| `apps/web/src/config/api.ts` + `F/auth/services/auth.service.ts`                  | Solo login opta por no redirigir automáticamente ante 401; requests protegidas conservan el valor por defecto.                   | Credenciales rechazadas quedan en el formulario para reintentar sin perder contexto. ES un cambio de ejecución, no solo de test.                 |
| `F/auth/hooks/use-login.ts`                                                       | Redirect posterior acepta ruta local segura; destino inválido cae en `/inicio`.                                                  | Un redirect inseguro ya no se usa. Payload de login y endpoint no cambiaron.                                                                     |
| `D/inicio/page.tsx`                                                               | Error de KPIs/especialidades/doctores ya no aparenta cero, vacío o éxito cacheado.                                               | Se muestra el fallo; se evita ofrecer datos/servicios de una respuesta fallida.                                                                  |
| `D/agenda/page.tsx` + `F/consultations/components/schedule-consultation-form.tsx` | Alertas explícitas y disponibilidad fallida invalida la caché; valores iniciales de selección vacíos.                            | Se bloquea agendar/actualizar con disponibilidad no válida; errores de acciones son visibles.                                                    |
| `D/pagos/page.tsx` + `F/payments/components/payment-columns.tsx`                  | Error/retry de ajuste y descarga; guard de anulación/ajuste; cierre del alta bloqueado durante envío.                            | No se cierra/resetea una operación en curso ni se permite duplicarla por esas acciones UI.                                                       |
| `F/payments/components/payment-form.tsx`                                          | Cambio de doctor limpia servicios; catálogos cargando/fallidos bloquean envío; Cancelar protegido.                               | No se envían servicios heredados de otro doctor ni datos de un catálogo inválido.                                                                |
| `F/payments/components/doctor-receipt-modal.tsx`                                  | Error PDF visible y resultados tardíos descartados al cerrar/cambiar selección.                                                  | Una descarga vieja no abre el recibo anterior ni altera el pending nuevo.                                                                        |
| `D/laboratorio/ordenes/page.tsx` + `F/lab-orders/components/lab-payment-form.tsx` | Detalle exige ID/estado válidos; snapshot preservado durante POST; controles/Cancel bloqueados.                                  | Refetch no pierde un cobro en curso; fuera de pending, un detalle inválido no habilita pagar.                                                    |
| `F/lab-orders/components/lab-order-form.tsx`                                      | Catálogos/error/pending protegidos; callback de éxito inmediato en lugar de retraso de 1,2 s.                                    | Cambia el momento del cierre para evitar que un callback viejo cierre una nueva alta.                                                            |
| `D/egresos/page.tsx` + `F/expenses/components/expense-form.tsx`                   | Motivo trim mínimo 5; descripción 2–200, montos positivos/precisión; Bs vacío omitido; etiqueta Bs corregida; pending protegido. | Entradas inválidas antes toleradas se bloquean según DTO existente; Bs deja de rotularse USD. La descripción de 2 caracteres ahora sí es válida. |
| `D/liquidaciones-doctores/page.tsx`                                               | Motivo trim mínimo 3, error visible y anulación pendiente protegida.                                                             | Alinea el DTO de Honorarios, que NO usa el mínimo 5 de egresos.                                                                                  |
| `F/doctor-payouts/components/doctor-payout-form.tsx`                              | Refetch conserva selección válida; cambio doctor limpia IDs; BCV/lookup/POST/preview protegidos y generaciones viejas ignoradas. | No se reactivan pagos deseleccionados ni se descarga un borrador de otro contexto. El contrato envía `paymentIds`.                               |
| `F/doctor-payouts/components/doctor-payout-detail-panel.tsx`                      | ID/error/fetch gobiernan detalle y exportación; PDF fallido reintenta; callbacks viejos ignorados.                               | No se presenta/exporta un ID ajeno ni una respuesta fallida como éxito.                                                                          |

En el estado de trabajo auditado **no hay diffs contra HEAD, cambios staged ni archivos untracked en `apps/api/` o `packages/`**. Esto incluye DTOs, servicios backend y migraciones de esas carpetas: no se modifican ahí reglas financieras, endpoints ni schema. Es una afirmación sobre el diff actual, NO sobre todo el historial del repositorio ni sobre el despliegue. El frontend sí cambió cómo valida y cuándo permite enviar el mismo contrato existente.

## Verificación fresca de esta auditoría

Base `W = docker compose -f docker-compose.dev.yml exec -T -w /app/apps/web web`:

| Comando                                                                  | Resultado                                                       | Evidencia local                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `W pnpm run test --runInBand --detectOpenHandles`                        | 179/179, 21 suites, 0 snapshots; exit 0; sin handles informados | `/tmp/frontend-impact-audit-tests.log`                                                           |
| `W pnpm run typecheck`                                                   | exit 0                                                          | `/tmp/frontend-impact-audit-typecheck.log`                                                       |
| `W pnpm exec eslint <19 rutas productivas modificadas> --max-warnings 0` | 19 archivos; exit 0                                             | `/tmp/frontend-impact-audit-eslint.log`; lista en `/tmp/frontend-impact-audit-runtime-files.txt` |
| `git diff --check`                                                       | exit 0 al cierre documental                                     | E048 en `progress.md`                                                                            |

El conteo de fuentes se obtuvo con `git diff HEAD --name-only -- apps/web/src`, excluyendo `*.test.*`, y se comprobó que no hay fuentes productivas nuevas untracked. Los 21 tests se contaron en disco y coincidieron con las 21 suites ejecutadas. El diff auditado está en `/tmp/frontend-impact-audit-runtime.diff`; estos logs temporales complementan, no reemplazan, la evidencia física de OpenSpec.

## Qué NO se puede confirmar todavía

- No se garantiza que todos los flujos normales estén libres de regresiones: solo pasan los escenarios retenidos y el chequeo estático actual.
- No hay navegador E2E, cookies reales, wrapper server async completo ni validación visual de PDF/contenido/fonts. La vida útil de URLs PDF preexistente no fue resuelta por esta auditoría.
- Las pruebas no demuestran liquidación financiera real, idempotencia backend, concurrencia de DB, aislamiento tenant o funcionamiento en Railway.
- No se corrió el lint global aquí: el baseline previo registra **5 errores y 3 warnings ajenos** en reports/medical-records. ESLint verde corresponde solo a los 19 archivos indicados.
- V02, `ConsultationPaymentForm` (2.2) y otros alcances siguen pendientes. No se archivó el cambio ni se autorizó una vista nueva.

**Conclusión comunicable:** se agregaron pruebas de componente/integración y se corrigieron bugs productivos que esas pruebas expusieron. Los escenarios comprobados pasan; no sería correcto decir «solo tests» ni prometer «no afecta nada».
