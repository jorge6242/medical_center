# Diseño técnico — borrador para revisión

## 1. Evidencia del repositorio

- `apps/api/prisma/schema.prisma`: `Tenant`, `User.tenantId` obligatorio y `AuditLog.tenantId` obligatorio; `AuditLog.userId` referencia `User`, no puede representar un `PlatformAdmin`.
- `apps/api/src/auth/auth.module.ts`: `JwtAuthGuard`, `AclGuard` y control adicional registrados como guards globales; hay guards tenant explícitos en controllers clínicos.
- `apps/web/src/middleware.ts`: interpreta cualquier subdominio del dominio raíz como `webSlug`, pero localhost no resuelve tenant. Reservar `admin` requiere una rama anterior a esa lógica.
- `apps/api/prisma/provision-tenant.ts`: transacción de tenant, roles, configuración y administrador; su upsert operativo NO equivale a una API de creación segura.
- `apps/api/prisma/subscription-provision.ts`: usa snapshots, bloqueo del tenant y validación de condiciones. Trabajo local no confirmado, dependencia pendiente de estabilizar.

## 2. Frontera de seguridad

Un monolito, dos realms explícitos: tenant y platform. Nuevos módulos bajo `apps/api/src/platform/`; ningún rol global en `Role` y ningún tenant artificial. Guard global despacha según metadata de realm, NO según un token decodificado sin verificar. Sin metadata, conserva realm tenant. Toda ruta platform protegida MUST autenticar `platform-jwt` y comprobar privilegios; solo login platform puede admitir credenciales sin sesión. No marcar gestión `@Public()` ni `@InternalRequest()` para esquivar guards. Auditar también guards globales adicionales.

JWT platform: clave dedicada requerida vía ConfigService/Joi, issuer propio, audience `platform`, propósito `platform-access`, `sub`, `sid`, `sessionVersion`, expiración de 8h. No incluye tenant ni PII extra. Verificación de sesión persistida, administrador activo y versión en cada request. Logout revoca `sid`; desactivar admin/cambiar contraseña revoca sesiones. JWT tenant existente se preserva; validadores rechazan el otro realm incluso si cookies o headers se manipulan.

Cookie `platform_access_token`, HttpOnly, host-only (sin Domain raíz), Path=/, SameSite=Lax, Secure en producción; localhost sin Secure únicamente en desarrollo. Nunca reemplazar/borrar `access_token`. Despliegue MUST validar proxy/API y uso real de cookies host-only: preferir mismo origen mediante proxy del frontend para `/api/platform/*`; si API separado, permitir solo origen admin exacto y diseñar cookie del host API, nunca compartir credenciales entre centros. Origin/Referer allowlist exacta y token CSRF por sesión obligatorio en mutaciones, incluido login/logout; CORS no sustituye CSRF. Rate limit login por IP/cuenta, mensajes genéricos y sin secretos en logs.

## 3. Datos y migraciones aditivas

| Modelo nuevo     | Campos mínimos propuestos                                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PlatformAdmin    | id UUID, email normalizado unique, name, passwordHash, isActive, sessionVersion, createdAt, updatedAt                                                                                                    |
| PlatformSession  | id UUID, platformAdminId FK, expiresAt, revokedAt, createdAt; índices admin/expiry                                                                                                                       |
| PlatformAuditLog | id, platformAdminId nullable para intento anónimo, actorKind, targetTenantId nullable, entity/entityId, action, oldValues/newValues, changedFields[], result, reason, requestId/correlationId, createdAt |

Actor CLI autenticado operativamente se identifica como SYSTEM/BOOTSTRAP, nunca como usuario tenant. Sin passwords, cookies, tokens ni hashes en snapshots. No cascade delete financiero/auditoría. Logs de mutaciones se escriben en la misma transacción; fallo de auditoría revierte el cambio. Eventos de login fallidos se registran separadamente, sin crear identidad falsa.

Reutilizar `TenantSubscription`, `SubscriptionPlan`, `SubscriptionPeriod`, `SubscriptionInvoice`, `SubscriptionPayment` del trabajo local una vez revisado; Decimal y snapshots existentes obligatorios. Agregar control de versión para ediciones concurrentes (version entero a Tenant y TenantSubscription, migración aditiva) y clave de idempotencia persistida para alta de tenant. No cambiar `User` ni FK de auditoría tenant para acomodar realm global.

## 4. Contratos HTTP propuestos

Todos bajo `/platform`, DTO de entrada/salida explícitos; fechas ISO UTC y montos string decimal, nunca floats. Error validación 400, sesión 401, autorización 403, inexistencia 404, conflicto/concurrencia 409. Listados paginados (`page>=1`, `limit` 1..100), orden estable por createdAt/id. Sin modelos Prisma crudos.

| Método/ruta                                                 | Entrada y salida                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /auth/login                                            | email/password + CSRF; cookie platform y `{id,name,email}` sin JWT en body                                                                                                                                    |
| POST /auth/logout; GET /auth/me                             | revocación solo platform; perfil platform                                                                                                                                                                     |
| GET /dashboard                                              | conteos de centros activos/inactivos, suscripciones por estado, saldo SaaS pendiente e ingresos SaaS confirmados del mes Caracas; excluye pagos VOIDED                                                        |
| GET /tenants; GET /tenants/:id                              | filtro name/slug/isActive; datos operativos, version y resumen SaaS, sin clínica                                                                                                                              |
| POST /tenants                                               | Idempotency-Key; name, slug, webSlug, email?, initialAdmin `{name,email,password}`, initialSubscription `{planCode,agreedPriceUsd,startsAt,dueAt,gracePeriodDays}`; devuelve tenant y resumen, nunca password |
| PATCH /tenants/:id                                          | name/email/webSlug, expectedVersion; slug interno inmutable en V1                                                                                                                                             |
| POST /tenants/:id/activation                                | isActive boolean, reason no vacía, expectedVersion; confirma impacto antes de envío                                                                                                                           |
| GET /subscription-plans                                     | planes activos existentes; creación/edición de catálogo fuera de V1                                                                                                                                           |
| GET /tenants/:id/subscription                               | contrato, períodos/facturas paginados y pagos                                                                                                                                                                 |
| PATCH /tenants/:id/subscription                             | agreedPriceUsd positivo <=2 decimales, gracePeriodDays 0..30, promoExpiresAt?, expectedVersion, reason; solo condiciones futuras                                                                              |
| POST /tenants/:id/subscription/status                       | status, reason, expectedVersion; transición explícita validada                                                                                                                                                |
| POST /tenants/:id/subscription/periods                      | planCode activo, startsAt/dueAt y clave idempotencia; período mensual Caracas, snapshots y factura únicos                                                                                                     |
| POST /tenants/:id/subscription/invoices/:invoiceId/payments | Idempotency-Key, currency, amountPaid positivo, exchangeRateSnapshot si moneda distinta de USD, method, reference?, paidAt; pago confirmado con monto USD calculado por Decimal                               |
| POST /tenants/:id/subscription/payments/:paymentId/void     | reason, expectedVersion o estado esperado, Idempotency-Key; anulación sin DELETE y recálculo de factura                                                                                                       |
| GET /audit                                                  | filtros tenant/entity/action/date, paginado; solo actor platform                                                                                                                                              |

Las rutas de la tabla son relativas a `/platform` (por ejemplo `/platform/auth/login`). Validar UUID, emails normalizados, slugs DNS lowercase y reservados `admin`, `www`, `api`, unicidad de slug/webSlug y fechas de vencimiento. Logo externo/upload fuera de V1. Las credenciales iniciales se transmiten una sola vez por TLS, no se almacenan en idempotency payload/auditoría; guardar fingerprint seguro del request.

## 5. Consistencia y transiciones

Alta nueva, NO upsert: transacción crea tenant, roles/config/reminders, usuario inicial, contrato, período/factura y auditoría. Reutilizar lógica pura de aprovisionamiento, no ejecutar scripts/importar su main en HTTP. Una falla no deja centro parcial. Idempotencia same-key/same-payload devuelve resultado saneado; distinto payload 409.

Estados subscription: TRIALING→ACTIVE/CANCELED; ACTIVE→PAST_DUE/SUSPENDED/CANCELED; PAST_DUE→ACTIVE/SUSPENDED/CANCELED; SUSPENDED→ACTIVE/CANCELED; CANCELED terminal en V1. reason obligatorio. Ninguno escribe automáticamente Tenant.isActive ni modifica permisos/login; solo activación explícita suspende acceso del centro. No automatizar estados por pago en V1.

Bloqueo transaccional de factura/contrato en cobro; validar cadena invoice→period→subscription→tenantId seleccionado. Solo confirmados no anulados suman saldo, rechazar sobrepago y factura VOIDED. USD: tasa null/1 consistente; VES: tasa positiva snapshot, amountUsd=amountPaid/tasa redondeado a 2 decimales. Métodos compatibles con moneda; sin IGTF/split clínico. Saldo cero→PAID, abono→PARTIALLY_PAID; void vuelve al estado correspondiente al saldo y vencimiento. Doble click/retry mismo payload no duplica; misma key global en otro tenant/factura devuelve 409 sin filtrar datos. Cambios de precio/plan no reescriben períodos, facturas ni pagos históricos.

## 6. Frontend y operación

Grupo/layout platform independiente del dashboard tenant; thin pages, services platform + TanStack Query, RHF/zod y skeletons. apiFetch platform redirige 401 a `/platform/login`; tenant conserva `/login`. Query keys incluyen realm/tenant seleccionado; logout limpia solo cache platform. Login global no pide tenantSlug/access/contextToken.

Producción: admin host permite rutas platform y rechaza rutas clínicas; hosts tenant no sirven panel global. Local permite ambas rutas con sesiones coexistentes. Middleware es routing/UX, la API es autoridad. Preflight DB: si existe `Tenant.webSlug='admin'`, STOP despliegue hasta resolución explícita sin renombrar automáticamente. Configurar DNS/TLS y proxy sin tocar DNS de centros. Bootstrap mediante comando Make/Docker, sin registro público ni admin predeterminado; bcrypt async, secretos sin argumento visible/log.

## 7. Verificación, entrega y rollback

Strict TDD backend (RED/GREEN/REFACTOR): guard dispatch, auth/session/CSRF, transacciones, concurrencia financiera y auditoría. Frontend sin runner actual: typecheck/lint Docker y matriz manual; no fingir tests existentes ni agregar runner sin decisión. Regresión de dos tenants: subdominio, enlace local, login/me/logout, ACL y endpoints clínicos, cookies coexistentes; platform no obtiene clínica. Nunca build.

Primero revisar/estabilizar dependencia SaaS, luego migraciones aditivas, auth aislada, tenants, SaaS y panel por slices verticales <400 líneas. Apply requiere revisión y decisión de entrega. Rollback deshabilita realm/host platform y mantiene datos/migraciones; nunca down-v, DROP ni cambios destructivos.

### Reglas complementarias de período e idempotencia

La creación de período MUST bloquear contrato, rechazar rangos solapados y exigir startsAt < endsAt y dueAt >= startsAt; endsAt se calcula por mes calendario Caracas. Clave de alta/período se persiste con realm, operación, destino y fingerprint seguro; no guarda plaintext de password. Respuestas repetidas nunca vuelven a exponer credenciales. Si cambian condiciones futuras, el nuevo período captura su versión contractual vigente. Las claves/versiones de anulación de pago deben añadirse de manera aditiva si la dependencia SaaS todavía no las provee.
