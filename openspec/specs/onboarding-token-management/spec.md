# Onboarding Token Management Specification

## Purpose

Define the behavior for creating, validating, rotating, and completing onboarding tokens that enable doctors to activate their accounts via secure email links.

## Requirements

### Requirement: OnboardingToken MUST record all invitation attempts

The `OnboardingToken` model SHALL track: `userId`, `token` (JWT), `expiresAt`, `sentAt`, `completedAt`, `status` (`PENDING`, `COMPLETED`, `EXPIRED`), `ipAddress`, and `userAgent`. Each send-onboarding action SHALL create a new row.

#### Scenario: Admin sends onboarding to a doctor

- GIVEN a doctor without a `User`
- WHEN admin clicks "Enviar onboarding"
- THEN a new `OnboardingToken` row is created with status `PENDING`
- AND the token expires in 24 hours

### Requirement: Rate limiting MUST prevent onboarding spam

The system SHALL allow a maximum of 3 `OnboardingToken` rows per `userId` within any 1-hour window. Exceeding this SHALL return `429 Too Many Requests`.

#### Scenario: Admin clicks send 4 times in 1 hour

- GIVEN a doctor has received 3 onboarding emails in the last hour
- WHEN admin clicks "Enviar onboarding" a 4th time
- THEN the system returns `429` with message "Límite de 3 invitaciones por hora alcanzado"

### Requirement: Token rotation MUST invalidate previous tokens

Before creating a new `PENDING` token, the system SHALL `UPDATE` all existing `PENDING` tokens for that `userId` to `EXPIRED`.

#### Scenario: Admin re-sends onboarding

- GIVEN a doctor has a `PENDING` onboarding token
- WHEN admin sends onboarding again
- THEN the previous token status becomes `EXPIRED`
- AND a new `PENDING` token is created

### Requirement: Onboarding completion MUST mark token as COMPLETED

When a doctor sets their password via `POST /auth/onboarding/:token`, the system SHALL update the `OnboardingToken` to `status: COMPLETED` and set `completedAt` to the current time.

#### Scenario: Doctor completes onboarding

- GIVEN a doctor received an onboarding email with a valid token
- WHEN they submit their password via the onboarding page
- THEN the `User.passwordHash` is updated
- AND `OnboardingToken.status` becomes `COMPLETED`
- AND subsequent attempts to use the same token return `410 Gone`

### Requirement: Token validation MUST enforce single-use and expiration

The `POST /auth/onboarding/:token` endpoint SHALL verify:
1. JWT signature and expiration
2. Token exists in `OnboardingToken` table
3. Status is `PENDING` (not `COMPLETED` or `EXPIRED`)
4. `expiresAt` has not passed

#### Scenario: Reusing a completed token

- GIVEN a doctor already completed onboarding
- WHEN they attempt to access `/auth/onboarding/:token` again
- THEN the system returns `410 Gone` with message "Esta invitación ya fue utilizada"

#### Scenario: Using an expired token

- GIVEN 25 hours have passed since the token was sent
- WHEN the doctor clicks the onboarding link
- THEN the system returns `410 Gone` with message "El enlace de activación ha expirado"

## REMOVED Requirements

None.
