# Proposal: Onboarding por email para doctores

## Intent

Los administradores deben poder invitar a un doctor recién creado a configurar su contraseña y acceder al sistema mediante un enlace seguro de un solo uso enviado por correo electrónico. El sistema debe prevenir abuso del botón "Enviar onboarding" (rate limiting), permitir reenvíos controlados (token rotation), y dejar una evidencia auditable de cada intento para soporte y auditoría.

## Scope

### In Scope
- **Schema**: tabla `OnboardingToken` con historial de envíos, expiración, estado (`PENDING`, `COMPLETED`, `EXPIRED`), y metadata (IP, userAgent).
- **Endpoint**: `POST /doctors/:id/send-onboarding` — admin envía (o reenvía) onboarding. Valida rate limit (máx 3 tokens por doctor en ventana de 1 hora). Invalida token anterior marcándolo `EXPIRED`. Crea `User` si no existe, o reutiliza existente.
- **Endpoint**: `POST /auth/onboarding/:token` — doctor valida token y setea contraseña. Marca `OnboardingToken` como `COMPLETED`.
- **Email**: envío de email con link `/onboarding?token=xyz` usando servicio de email (SMTP/SendGrid/AWS SES). Template mínimo en español.
- **Rate limiting nativo**: `COUNT(*) FROM onboarding_tokens WHERE doctorId = X AND sentAt > NOW() - INTERVAL '1 hour'`.
- **Token**: JWT de un solo uso con payload `{ sub: userId, purpose: 'onboarding', exp: +24h }`. No reutilizable.
- **Frontend admin**: Botón "Enviar onboarding" en tabla de doctores con estado de invitación (PENDING/COMPLETED/EXPIRED).
- **Frontend onboarding**: Página `/onboarding` que lee `?token=`, valida con backend, muestra formulario de contraseña.

### Out of Scope
- Configuración de SMTP (asumir que existe o se agrega en infraestructura).
- Templates de email con branding completo (solo texto/plano o HTML básico).
- Notificaciones push o SMS.
- Reutilización para "Olvidé mi contraseña" (patrón similar, pero change futuro).
- Cron de limpieza de tokens expirados (puede agregarse después).

## Capabilities

### New Capabilities
- `doctor-onboarding-flow`: Flujo completo de invitación por email para doctores.
- `onboarding-token-management`: Creación, invalidación, validación y rate-limit de tokens de onboarding.

### Modified Capabilities
- `doctor-profile-self`: El Change 2 asume que el doctor ya tiene `User` creado. El onboarding es el mecanismo por el cual ese `User` se crea.

## Approach

1. **Schema**: migración Prisma agrega `OnboardingToken` y `OnboardingTokenStatus` enum.
2. **Service**: `OnboardingService` encapsula toda la lógica:
   - `sendOnboarding(doctorId, adminUserId)` → crea `User` si no existe, genera token JWT, guarda en `OnboardingToken`, envía email.
   - `validateToken(token)` → verifica JWT + existe en DB + status `PENDING` + no expirado.
   - `completeOnboarding(token, password)` → valida token, setea `passwordHash` en `User`, marca `COMPLETED`.
3. **Rate limit**: dentro de `sendOnboarding`, query `COUNT` de tokens del doctor en última hora. Si ≥ 3, `429 Too Many Requests`.
4. **Token rotation**: antes de crear nuevo token, `UPDATE onboarding_tokens SET status = 'EXPIRED' WHERE doctorId = X AND status = 'PENDING'`.
5. **Email**: función async pura en `services/email.service.ts` (o `MailerModule` NestJS). No bloquea el HTTP request si falla; se loguea el error y se puede reintentar manualmente.
6. **Seguridad**: el link de onboarding es de un solo uso. Una vez completado, el token queda `COMPLETED`. Si se intenta reutilizar, el backend retorna `410 Gone`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | New | Modelos `OnboardingToken` + enum |
| `apps/api/src/doctors/` | Modified | `POST /doctors/:id/send-onboarding` en controller/service |
| `apps/api/src/auth/` | New | `POST /auth/onboarding/:token` endpoint |
| `apps/api/src/common/services/` | New | `EmailService` (envío de emails) |
| `apps/web/src/features/doctors/` | Modified | Botón + badge de estado de onboarding en tabla |
| `apps/web/src/app/(onboarding)/` | New | Página `/onboarding` con formulario de contraseña |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Email no llega (SMTP caído) | Medio | Loguear error; admin puede reintentar manualmente. No fallar creación de token. |
| Admin clickea "Enviar" 10 veces seguidas | Bajo | Rate limit de 3 por hora + invalidación de token anterior. |
| Token interceptado en tránsito | Bajo | HTTPS obligatorio + expiración 24h + un solo uso. |
| Doctor comparte link con otra persona | Medio | Link es de un solo uso; una vez completado, no sirve. No contiene info sensible. |

## Rollback Plan

1. Eliminar `OnboardingToken` del schema + migración de rollback.
2. Eliminar endpoints `send-onboarding` y `/auth/onboarding/:token`.
3. Eliminar página `/onboarding` del frontend.
4. Los doctores con `User` creado por onboarding siguen funcionando; solo se pierde la capacidad de invitar nuevos.

## Dependencies

- **Change 1** (`doctor-consultations-filter`): debe estar implementado (proporciona `User.doctorId` vía `Doctor.userId`).
- **Change 2** (`doctor-profile-self`): asume que el doctor tiene `User` y puede loguearse. El onboarding es el puente que crea ese `User`.
- **Infraestructura**: servicio de email (SMTP host/port/user/pass) configurado en variables de entorno.

## Success Criteria

- [ ] Admin puede enviar onboarding a un doctor sin `User`.
- [ ] Si el doctor ya tiene `User`, el onboarding actualiza el token (no recrea el usuario).
- [ ] Rate limit: máximo 3 envíos por hora por doctor.
- [ ] El link de onboarding expira en 24h.
- [ ] Una vez completado, el token no se puede reutilizar (`410 Gone`).
- [ ] Frontend admin muestra estado de onboarding (PENDING/COMPLETED/EXPIRED).
- [ ] `pnpm run typecheck` y `pnpm run lint` pasan.
