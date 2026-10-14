# Verificación — platform-admin (2026-10-12)

## Estado

Revisión independiente inicial detectó cuatro bloqueantes; corregidos mediante RED→GREEN y regresiones locales. **Reverificación independiente completada sin CRITICAL nuevos; QA navegador/producción pendiente.** No archivar ni afirmar ready-to-production.

## Hallazgos y resolución

| Hallazgo                                                         | Corrección                                                                                                                                                                                                                                                                                          | Evidencia y límite                                                                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 401 recargaba el navegador y useRef se perdía al desmontar shell | API emite evento; recovery montado en Providers usa router SPA. Registry RAM arriba del ciclo layout, scoped actor+operación, guarda key/payload y executor que recibe nuevo CSRF. Banner global recupera intentos incluso si factura PAID ya oculta modal. Otro actor no obtiene intentos previos. | RED API reload y registry inexistente; GREEN evento +3 registry tests. **No es prueba integral React/navegador**; flujo visual reauth pendiente. Cierre/recarga completa aún exige conciliación. |
| Período tomaba precio/estado/contigüidad fuera de transacción    | Contrato bloqueado FOR UPDATE; contrato/estado/version/plan/último período e idempotencia reread en misma transacción; edición contractual y estado toman mismo lock.                                                                                                                               | Unit20 + PostgreSQL2 concurrentes: una factura/período/auditoría; mismo key replay, distinto key rechazo.                                                                                        |
| VOID validaba estado antes de lock y desconocía vencimiento      | Pago scoped + CONFIRMED e idempotencia reevaluados tras invoice lock. Replay bajo lock también al cobrar; invoiceStatusFor incluye dueAt/now y devuelve OVERDUE si queda saldo vencido.                                                                                                             | Unit14 de math/service + PostgreSQL3: pagos y anulaciones simultáneas, replay y conflictos, única auditoría VOID, OVERDUE. Dashboard ya incluye OVERDUE.                                         |
| Auditoría global omitía requestId/correlationId                  | ALS platform separado, IDs generados en servidor por HTTP; escrituras/auth toman mismo contexto. Bootstrap corre contexto SYSTEM y fallback SYSTEM distinto para ejecución sin HTTP. API/UI de auditoría muestran IDs.                                                                              | Unit2: múltiples escrituras mismo contexto, concurrencia aislada y fallback system. Header cliente no gobierna identidad de auditoría platform.                                                  |

## Comandos Docker reproducibles

```bash
docker compose -f docker-compose.dev.yml exec -T api pnpm exec jest --runInBand platform src/auth/guards/jwt-auth.guard.spec.ts
docker compose -f docker-compose.dev.yml exec -T api env NODE_ENV=test PLATFORM_DB_TESTS=1 pnpm exec jest --config test/jest-e2e.json --runInBand platform-payment-concurrency platform-period-concurrency platform-realm-regression
docker compose -f docker-compose.dev.yml exec -T web sh -c 'node --test src/features/platform-shared/*.test.mjs'
docker compose -f docker-compose.dev.yml exec -T api pnpm run typecheck
docker compose -f docker-compose.dev.yml exec -T web pnpm run typecheck
```

E2E DB opt-in rechaza NODE_ENV no test y hostname distinto de db, crea UUIDs descartables y limpia sólo fixtures propios. HTTP usa guards reales con fronteras DB/auth mockeadas; no equivale a login de credenciales reales.

## Calidad y riesgos conservados

- Revisión inicial reportó 96 unitarios plataforma+guard, 12 web y 4 HTTP verdes y coverage lines65.62%; era cobertura parcial, sin umbral contractual. No reutilizar ese porcentaje como cobertura final.
- Full suite backend previa presenta fallas en pacientes/payouts/reportes ajenas al batch; lint web completo tiene errores/warnings en módulos ajenos. No se modificaron para ocultar resultados.
- Sin builds, commits, PR ni producción. Migraciones aditivas conservadas.
- Pendientes: QA de remount/reauth/browser, sesiones reales de dos centros, DNS/TLS/proxy headers/cookie flags, múltiples réplicas/rate limiter e IP confiable, ensayo rollback aplicación anterior.

## Resultado después de correcciones

- Platform+JwtAuthGuard: **17 suites / 106 tests verdes**.
- HTTP/concurrencia PostgreSQL: **3 suites / 9 tests verdes**.
- Web funciones/API/routing/registry: **16 tests verdes**.
- Typecheck API/web y API lint completo + web lint scoped: **verdes**. Diff check sin errores.
- Reverificación independiente: volvió a ejecutar 106 unitarios, 9 HTTP/DB y 16 web, todos verdes; confirmó correcciones de cuatro bloqueantes y doble anulación concurrente. Sin CRITICAL nuevos en el alcance revisado. UI reauth en navegador pendiente; no presentar tests de registry como equivalentes a interacción React.

## Bugfix: IDs históricos de tenant (2026-10-12)

- Causa: `Tenant.id` es Prisma `String @default(uuid())`, no una columna UUID. Seeder persiste `tenant-demo-001`; `ParseUUIDPipe`/`IsUUID` en plataforma rechazaban registros existentes antes del servicio.
- Fix quirúrgico: pipe y decorador compartidos para ID opaco de 1–128 caracteres, sin whitespace/control ni separadores de URL (`/`, `\`, `?`, `#`). Aplicados SOLO a parámetros de tenant en tenants/suscripciones y filtro targetTenantId de auditoría. invoiceId/paymentId conservan UUID. No se migraron IDs ni modificaron guard/session/filtros de pertenencia.
- TDD RED: suite HTTP nueva, 9 fallas/3 verdes antes del fix (400 en lugar de éxito para ID sembrado). GREEN: 12 tests de identificadores +4 regresiones de realms, 2 suites/16 tests verdes. Validación HTTP real (pipes, DTOs, CSRF); identidad y límites de servicios mockeados, sin mutaciones de DB. Cubre detalle/update/activation/contrato/status/período/pago/void/audit, unknown ID404 desde boundary del servicio, malformed/129 caracteres400 y payment UUID estricto. Servicios reales conservan NotFoundException al no encontrar registro.
- Comandos Docker: `docker compose -f docker-compose.dev.yml exec -T api pnpm exec jest --config test/jest-e2e.json --runInBand platform-tenant-identifiers platform-realm-regression`; `pnpm run typecheck`; `pnpm run lint` dentro de API: verdes. Sin build/deploy/commit. QA externa previamente pendiente permanece pendiente.
