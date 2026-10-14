# Tareas — avance de implementación, 2026-10-12

## 1. Infraestructura y decisiones previas

- [x] 1.1 Owner autorizó continuar automáticamente y un cambio grande: “mejor un unico cambio grande”. Estrategia exception-ok, size:exception humana; sin commits/PR/build/deploy. Revisión independiente al cierre pendiente.
- [ ] 1.2 Revisar/estabilizar dependencia SaaS local; identificar migraciones efectivamente aplicadas sin asumir producción.
- [ ] 1.3 Preflight de webSlug reservado admin, DNS/TLS/proxy/cookies y todos los guards globales.
- [x] 1.4 DTOs/transiciones/CSRF concretos implementados y cubiertos por tests; GET subscription agrega paginación independiente. Login real username+password; proxy same-origin + Origin/header prelogin y HMAC de sesión documentados.
- [x] 1.5 Migraciones aditivas y rollback conservador documentados; ejecución de rollback con aplicación previa sigue pendiente en 4.4.

## 2. Implementación backend (Strict TDD Docker, por unidad)

- [x] 2.1 Migración aplicada `20261012170941_add_platform_admin` (aditiva): PlatformAdmin (con `username` único + `email` opcional, ver nota en design.md §3), PlatformSession, PlatformAuditLog, PlatformIdempotencyKey, y `version` en Tenant y TenantSubscription. Cliente Prisma regenerado. Pendiente: fixtures de identidad/session/actor para tests de 2.3+.
- [x] 2.2 RED: bootstrap seguro/idempotente; GREEN `scripts/platform-bootstrap.sh` invocado por `make platform-bootstrap`. Pide usuario (default `exiadmin`) y clave con `read -s` + confirmación; NUNCA acepta la clave como argumento ni la escribe en repo, logs o historial. Ejecuta la creación dentro del contenedor (`docker compose exec -T api ...`) con bcrypt async. Idempotente: si el usuario existe, exige confirmación explícita antes de cambiar la clave. Registra evento `SYSTEM/BOOTSTRAP` en PlatformAuditLog. Sin signup público ni admin predeterminado.
- [x] 2.3 RED→GREEN: login/logout/me en `/platform/auth/*`, dispatcher por `@PlatformRealm()` en JwtAuthGuard, JWT con secreto `PLATFORM_JWT_SECRET` (distinto de JWT_SECRET), issuer/audience/purpose propios, sesión revocable y `sessionVersion`. 14 tests unitarios nuevos + guard spec actualizado.
- [x] 2.4 CSRF: Origin exacto (`PLATFORM_ALLOWED_ORIGINS`, fallback `FRONTEND_URL`) en todas las mutaciones; login exige header `x-platform-request`; autenticadas exigen `x-csrf-token` ligado a la sesión (HMAC). Rate limit de login: 5 fallos por cuenta y 20 por IP en 15 min, 429 (en memoria por proceso; con varias instancias pasar a Redis). Cookie host-only verificada por test. 31 tests de plataforma en verde. Pendiente antes de exponer: prueba de cookies coexistentes con sesión tenant real en localhost.
- [x] 2.5 RED→GREEN: `GET /platform/tenants` (paginado, filtros name/slug/isActive, orden estable), `GET /platform/tenants/:id`, `PATCH /platform/tenants/:id` (name/email/webSlug, expectedVersion, slug inmutable), `POST /platform/tenants/:id/activation` (isActive + motivo obligatorio + expectedVersion; no-op = 409). Selección sólo operativa; escritura con guarda de versión y auditoría en la misma transacción; webSlug validado (DNS, reservados admin/www/api). 14 tests nuevos. Pendiente: pruebas e2e con sesión real tras el bootstrap.
- [x] 2.6 RED→GREEN: `POST /platform/tenants` con `Idempotency-Key` (replay mismo payload, 409 payload distinto, huella HMAC sin clave en claro). Alta en una sola transacción: tenant, roles/config/recordatorios (seeders movidos a `src/common/provisioning`), admin inicial, contrato, período mensual Caracas, factura y auditoría. Sin upsert. Tests: 29 de alta + reglas puras; el spec falla si se escribe fuera de la transacción. Pendiente: e2e con sesión real.
- [x] 2.7 RED→GREEN: `GET /platform/tenants/:id/subscription`, `PATCH .../subscription` (precio/gracia con expectedVersion y motivo; sólo afecta períodos futuros), `POST .../subscription/status` (transiciones de design §5, CANCELED terminal, nunca toca Tenant.isActive), `POST .../subscription/periods` (mes calendario Caracas, contiguo al último, snapshots, factura única, idempotencia con huella que incluye tenantId), `GET /platform/subscription-plans`. 12 tests de servicio + reglas. Verificado con sesión real en dev: 200/201/400/409 según corresponde.
- [x] 2.8 RED→GREEN: `POST .../subscription/invoices/:invoiceId/payments` (USD o VES con tasa snapshot, monto en Decimal, método compatible con moneda, sobrepago 409, factura anulada 409, fila bloqueada con FOR UPDATE, estado de factura recalculado, idempotencia con huella) y `POST .../subscription/payments/:paymentId/void` (sin DELETE, motivo obligatorio, recálculo de factura). 23 tests nuevos. Verificado con sesión real. Pendiente: prueba de concurrencia real con dos pagos simultáneos.
- [x] 2.9 RED→GREEN: `GET /platform/dashboard` (centros activos/inactivos, suscripciones por estado, saldo SaaS abierto, ingresos confirmados del mes Caracas excluyendo anulados) y `GET /platform/audit` (paginado, filtros tenant/entidad/acción/rango, orden descendente, sin credenciales). 84 tests de plataforma en verde. Verificado con sesión real.

## 3. Implementación frontend y routing

- [x] 3.1 Realm web independiente: `/platform/login` (formulario RHF+zod), `/platform` con shell protegido (`/platform/auth/me`, logout con CSRF), `apiFetch` redirige 401 de `/platform/*` a `/platform/login` sin bucle, caché de plataforma separada (`['platform', ...]`), middleware: host `admin.` sólo `/platform`, centros nunca sirven `/platform`. Typecheck y lint limpios; páginas verificadas con 200 en dev.
- [x] 3.2 Pantallas de centros: `/platform/tenants` (listado con filtros y paginación), `/platform/tenants/nuevo` (alta con RHF+zod, `Idempotency-Key` estable por intento y rotada tras error), `/platform/tenants/[id]` (detalle, edición con `expectedVersion`, activación/desactivación con modal y motivo obligatorio). Servicios y hooks en TanStack Query; errores en toast. Typecheck y lint limpios; rutas responden 200.
- [x] 3.3 Contrato/precio/gracia/estado, períodos/facturas/pagos paginados, registro USD/VES, anulación confirmada, auditoría con actor/objetivo/snapshots y navegación. Monto/precio >0. Reintentos inciertos conservan key+payload también en alta de centro; UI ofrece reenvío original explícito, sin persistir secretos. Pendiente QA visual manual; evidencia en apply-progress.md.
- [x] 3.4 Dashboard SaaS real conectado por service+query: centros, estados comerciales, saldo incluyendo OVERDUE y cobros confirmados del mes Caracas; skeleton/error/retry sin datos clínicos.

## 4. Verificación y operación

- [x] 4.1 Tests plataforma unitarios y 5 regresiones HTTP/DB Docker ejecutados; RED/GREEN registrado. Suite backend completa también ejecutada, presenta fallas en módulos ajenos a este batch (ver apply-progress); no afirmar verificación global aprobada.
- [ ] 4.2 Typecheck/lint de workspaces afectados dentro de Docker; formatear solo archivos propios.
- [ ] 4.3 Regresión manual de dos tenants: subdominio/acceso local/login/me/logout/ACL y flujos clínicos; probar coexistencia y rechazo cruzado.
- [ ] 4.4 Verificar cada escenario spec, concurrencia/idempotencia real DB y rollback de migraciones aditivas con aplicación previa.
- [x] 4.5 Runbook docs/platform-admin-operations.md: bootstrap, proxy/cookies/Origin, DNS/TLS checklist, revocación/rotación y rollback sin pérdida. Revisión/habilitación de producción siguen explícitamente pendientes.

## Review Workload Forecast

- Estimated changed lines: >400 (estimación preliminar 1800–3000, revisar con tareas refinadas).
- Chained PRs recommended: Yes (recomendación original; owner eligió excepción).
- 400-line budget risk: High.
- Decision needed before apply: No (decisión registrada 2026-10-12).
- Delivery strategy: exception-ok; owner autorizó “mejor un unico cambio grande” después de advertencia >400 líneas. size:exception concedida para este cambio, sin autorizar commits/PR/deploy.

Slices recomendadas (<400 líneas CADA PR, subdividir si excede): (A) dependencia/schema/bootstrap; (B) auth/sesión; (C) guards/CSRF/regresión tenant; (D) gestión tenant; (E) alta transaccional; (F) contratos/períodos; (G) pagos/anulación; (H) shell/login UI; (I) tenants UI; (J) SaaS UI; (K) dashboard/auditoría/operación. Cada unidad incluye tests/docs; no separar pruebas para maquillar presupuesto. Dependencias aditivas no deben habilitar panel incompleto; activar exposición solo tras verificación conjunta.

## Evidencia adicional 2026-10-12

- Pendiente de concurrencia en 2.8 RESUELTO localmente: dos pagos simultáneos PostgreSQL, 1 éxito/1 conflicto409, replay sin duplicación y cleanup fixtures propios.
- 1.2/1.3 parcialmente verificados LOCAL: 43 migraciones up-to-date, webSlug admin sin conflictos; estado de producción/DNS/TLS no inspeccionado.
- 4.2 parcialmente verificado: API/web typecheck y API lint + web lint scoped verdes; lint web global falla en archivos ajenos a este batch. No modificar esas funciones para maquillar cierre.

## Fixes de revisión independiente — 2026-10-12

- [x] Preservar key/payload por actor+operación durante navegación SPA a reauth, con recovery en Providers y reintento global usando nuevo CSRF; pérdida por reload/cierre sigue conciliación explícita.
- [x] Lock contrato + lecturas snapshot/status/contigüidad dentro tx; cambios precio/estado comparten bloqueo.
- [x] VOID/pago releen idempotencia/estado después de invoice lock; OVERDUE respeta dueAt.
- [x] Auditoría global request/correlation IDs generados por servidor, contexto HTTP/System/Bootstrap, disponibles en consulta.
- [ ] Reverificación independiente final y QA real navegador/reauth (tests de registry NO equivalen a integración React).
