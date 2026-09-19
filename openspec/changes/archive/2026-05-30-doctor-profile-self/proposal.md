# Proposal: "Mi Perfil" para doctores con verificación de licencia

## Intent

Los doctores necesitan una pantalla propia para gestionar su información básica y verificar su licencia médica ante el SACS. Esto descongestiona la vista de administración de doctores (`/admin/doctores`) y empodera al médico para mantener sus datos actualizados sin depender de un admin.

## Scope

### In Scope
- Nuevo endpoint `GET /doctors/me` → retorna datos del doctor vinculado al `User` logueado.
- Nuevo endpoint `PATCH /doctors/me` → actualiza `name`, `email`, `phone` (no permite cambiar `documentId` ni `documentType` desde este endpoint; eso sigue siendo admin-only).
- Nuevo endpoint `POST /doctors/me/verify-license` → invoca `SacsVerificationService.verifyDoctor()` con el `doctorId` del usuario logueado y retorna resultado.
- Nuevo endpoint `GET /doctors/me/verification-status` → retorna estado actual de `verificationStatus` sin re-verificar.
- Nueva página frontend `/mi-perfil` con formulario de edición y botón de verificación.
- El formulario muestra: nombre, email, teléfono, cédula (read-only), estado de verificación, y botón "Verificar licencia".
- Al verificar, se actualiza `verificationStatus`, `medicalLicenseNumber`, `verifiedAt`, `lastVerifiedAt`.

### Out of Scope
- Subida de fotos o documentos adjuntos.
- Cambio de especialidades desde "Mi Perfil" (sigue siendo admin-only).
- Cambio de datos bancarios desde "Mi Perfil" (sigue siendo admin-only / receipts).
- Notificaciones push al verificar.
- Re-verificación automática periódica (ya existe cron, no lo tocamos).

## Capabilities

### New Capabilities
- `doctor-profile-self`: Endpoints y UI para que un doctor gestione su propio perfil.
- `doctor-license-verification-ui`: Flujo de botón + polling/spinner contra `POST /doctors/me/verify-license`.

### Modified Capabilities
- `consultations-list-ssp`: La navegación de doctor necesita el nuevo ítem "Mi Perfil" (ya cubierto en change `doctor-consultations-filter`).

## Approach

1. **Backend**: Reutilizar `SacsVerificationService` existente. Crear un nuevo `DoctorsMeController` (o extender `DoctorsController`) con guardias propias: `@RequirePermission('doctors', 'read')` para GET, `@RequirePermission('doctors', 'update')` para PATCH/POST. El service busca el doctor por `req.user.doctorId` en lugar de por `param id`.
2. **Seguridad**: Si `req.user.doctorId` es null, retornar `404` (no existe perfil de doctor para este usuario). Si el `doctorId` no pertenece al tenant del usuario, `AclGuard` ya lo bloquea por permisos, pero añadimos validación explícita.
3. **Frontend**: Nueva feature `features/doctors-profile/` con:
   - `services/doctors-profile.service.ts` → funciones puras para los 3 endpoints.
   - `hooks/use-doctor-profile.ts` → `useQuery` para GET, `useMutation` para PATCH y verify.
   - `components/doctor-profile-form.tsx` → `react-hook-form` + `zod`, solo campos editables.
   - `app/(dashboard)/mi-perfil/page.tsx`.
4. **DTOs**: `UpdateDoctorProfileDto` (más restrictivo que `UpdateDoctorDto`; no incluye `documentType`, `documentId`, `splitPercentage`, `specialtyIds`, `bankAccount`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/doctors/` | Modified / New | `doctors-me.controller.ts`, DTOs, ajustes en service |
| `apps/web/src/features/doctors/` | New | `doctor-profile` sub-feature |
| `apps/web/src/app/(dashboard)/mi-perfil/` | New | Página de perfil |
| `apps/web/src/config/navigation.config.ts` | Modified | Nuevo ítem "Mi Perfil" visible solo para `role === 'doctor'` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SACS caído durante verificación | Medio | El endpoint devuelve el estado actual de DB + mensaje de error; no bloquea UI |
| Doctor intenta editar campos protegidos | Bajo | DTO restrictivo + whitelist en backend |
| `doctorId` no seteado en User | Medio | UI muestra estado vacío con CTA para contactar admin |
| Rate-limiting contra SACS | Bajo | El servicio ya tiene delay aleatorio (2-5s); no añadimos más calls |

## Rollback Plan

1. Eliminar `/mi-perfil` del frontend.
2. Eliminar `DoctorsMeController` del backend.
3. Revertir DTOs nuevos si no son referenciados por otros.

## Dependencies

- **Change `doctor-consultations-filter`**: debe estar implementado primero (proporciona `User.doctorId` y el rol en JWT). Este change asume que `req.user.doctorId` ya está disponible.

## Success Criteria

- [ ] Un doctor puede ver su nombre, email, teléfono, cédula y estado de licencia en `/mi-perfil`.
- [ ] Puede actualizar su nombre, email y teléfono.
- [ ] Puede clickear "Verificar licencia" y el sistema consulta SACS, actualiza estado y muestra resultado.
- [ ] Si SACS retorna `found: true`, `verificationStatus` cambia a `VERIFIED` y se guarda `medicalLicenseNumber`.
- [ ] Si el usuario no tiene `doctorId`, muestra mensaje amigable indicando que contacte al admin.
- [ ] Admin y otros roles no ven "Mi Perfil" en el menú.
- [ ] `pnpm run typecheck` y `pnpm run lint` pasan.
