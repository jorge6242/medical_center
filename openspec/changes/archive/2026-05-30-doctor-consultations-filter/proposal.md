# Proposal: Filtrar consultas por doctor logueado

## Intent

Actualmente el endpoint `GET /medical-records/paid-consultations` retorna **todas** las consultas pagadas del tenant. Un doctor con rol `doctor` ve pacientes y servicios de otros médicos, lo cual viola la privacidad clínica y genera ruido operativo. Necesitamos que, cuando el usuario autenticado tenga rol `doctor`, la lista se filtre automáticamente a las consultas donde él es el médico tratante.

## Scope

### In Scope
- Agregar `doctorId` opcional al modelo `User` en Prisma para vincular cuenta con perfil de doctor.
- Extender `JwtPayload` / `CurrentUser` para exponer `doctorId` cuando exista.
- Modificar `GET /medical-records/paid-consultations` para filtrar por `doctorId` cuando el rol sea `doctor`.
- Modificar el hook `usePaidConsultations` en frontend para no romper con el cambio.
- Ajustar la navegación del frontend: rol `doctor` solo ve "Consultas" y "Mi Perfil" (este último en change separado).

### Out of Scope
- Nuevo módulo de "Mis Pacientes" (solo filtrar consultas por ahora).
- Cambios al flujo de creación de informes médicos desde consultas.
- Verificación de licencia médica (va en change `doctor-profile-self`).
- Cambios de permisos ACL a nivel de roles (asumimos que el admin ya asignó `patients:read`).

## Capabilities

### New Capabilities
- `user-doctor-link`: Vínculo entre cuenta de usuario (`User`) y perfil de doctor (`Doctor`).

### Modified Capabilities
- `consultations-list-ssp`: Filtro automático por `doctorId` basado en rol autenticado.

## Approach

1. **Schema**: migración Prisma agrega `User.doctorId` (nullable, FK a `Doctor`).
2. **Auth**: al hacer login, si el `User` tiene `doctorId`, incluirlo en el JWT payload.
3. **Backend**: en `MedicalRecordsService.findPaidConsultations`, detectar si `req.user.role === 'doctor'`. Si es así, añadir `doctorId: req.user.doctorId` al `where` de Prisma.
4. **Frontend**: no cambia la API del hook, solo asegurar que la query pase `doctorId` cuando aplique. Como el backend infiere esto del token, el frontend **no necesita** enviarlo explícitamente (evita tampering).
5. **Menú**: usar el campo `role` del auth store para filtrar ítems de navegación cuando `role === 'doctor'`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Agregar `doctorId` nullable a `User` |
| `apps/api/src/auth/` | Modified | JWT payload incluye `doctorId` si existe |
| `apps/api/src/medical-records/` | Modified | Filtro automático por doctor en listado |
| `apps/web/src/config/navigation.config.ts` | Modified | Menú condicional por rol |
| `apps/web/src/stores/auth.store.ts` | Modified | Almacenar `doctorId` y `role` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users existentes sin `doctorId` quedan con campo null | Cierto | Es el comportamiento esperado; admins deben asignar doctorId desde gestión de usuarios |
| Doctor con `doctorId` mal asignado ve consultas de otro | Bajo | Validar en UI de admin que `doctorId` pertenece al mismo tenant |
| Rol no es exactamente string `'doctor'` | Medio | Normalizar enum o usar case-insensitive match; documentar en spec |

## Rollback Plan

1. Revertir migración Prisma (`npx prisma migrate dev --create-only` rollback script o `db push` con schema anterior).
2. Revertir cambios en auth service para no incluir `doctorId` en JWT.
3. Frontend: restaurar navegación original.

## Dependencies

- Ninguna externa. Requiere que el admin haya creado el `User` con `doctorId` asignado para que el filtro funcione.

## Success Criteria

- [ ] Un usuario con rol `doctor` y `doctorId` seteado solo ve sus propias consultas en `/consultas`.
- [ ] Un usuario con rol `admin` u otro sigue viendo todas las consultas.
- [ ] `pnpm run typecheck` pasa en API y Web.
- [ ] `pnpm run lint` pasa en ambos workspaces.
- [ ] Navegación del rol doctor muestra solo "Consultas" y "Mi Perfil" (este último en change 2).
