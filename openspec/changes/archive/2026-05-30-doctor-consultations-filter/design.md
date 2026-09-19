# Design: Filtrar consultas por doctor logueado

## Technical Approach

Agregar `Doctor.userId` en Prisma para vincular cada doctor con su cuenta de usuario. El `AuthService.login` incluirá la relación `doctor` en la query Prisma y cacheará `doctorId` en el JWT payload. El `MedicalRecordsService` recibirá el `JwtPayload` completo (no solo `tenantId`) para poder aplicar el filtro automático cuando `role === 'doctor'` y `doctorId` está presente. El frontend usará `role` del auth store para filtrar la navegación.

## Architecture Decisions

### Decision: Relación en Doctor (no en User)

**Choice**: `Doctor.userId` nullable FK → `User.id`; `User.doctor` relación inversa.
**Alternatives**: `User.doctorId` (columna polimórfica, rompe con más perfiles).
**Rationale**: `User` es la entidad de autenticación. Un usuario puede tener múltiples perfiles futuros (doctor, recepcionista, enfermera) sin ensuciar la tabla `User`. `Doctor` es el perfil de negocio que necesita saber a quién pertenece.

### Decision: Filtro en service, no en controller

**Choice**: `MedicalRecordsService.findPaidConsultations` recibe `JwtPayload` y aplica el `where.doctorId` internamente.
**Alternatives**: Controller modifica el query DTO antes de pasarlo al service.
**Rationale**: La lógica de autorización basada en rol pertenece al service (o a un guard interceptor). El controller solo debe componer, no decidir políticas de filtrado.

### Decision: Frontend no envía doctorId explícitamente

**Choice**: El backend infiere `doctorId` del JWT. El frontend solo envía `page`, `limit`, `search`.
**Alternatives**: Frontend lee `doctorId` del auth store y lo envía como query param.
**Rationale**: Evita tampering. Un doctor malicioso no puede cambiar `?doctorId=otro` para ver consultas ajenas.

## Data Flow

```
Login:
  AuthService.login()
    └── prisma.user.findMany({ include: { role: ..., doctor: true } })
        └── JWT payload: { ..., role, doctorId: user.doctor?.id ?? null }
            └── Cookie HttpOnly

Request /medical-records/paid-consultations:
  JwtAuthGuard → req.user = payload
    └── MedicalRecordsController.findPaidConsultations(user, query)
        └── MedicalRecordsService.findPaidConsultations(user.tenantId, user, query)
            └── if (user.role === 'doctor' && user.doctorId) {
                  where.doctorId = user.doctorId;  // filtro automático
                }
                prisma.consultation.count/findMany({ where })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Agregar `Doctor.userId String? @unique` + `User.doctor Doctor?` |
| `prisma/seeders/users.seeder.ts` | Modify | Crear `User` con rol `doctor` para cada demo doctor |
| `prisma/seeders/doctors.seeder.ts` | Modify | Asignar `userId` en `Doctor.create` |
| `src/common/decorators/current-user.decorator.ts` | Modify | Agregar `doctorId: string \| null` a `JwtPayload` |
| `src/auth/auth.service.ts` | Modify | `include: { doctor: true }` en login; `doctorId` en payload |
| `src/medical-records/medical-records.controller.ts` | Modify | Pasar `user` completo al service en `findPaidConsultations` |
| `src/medical-records/medical-records.service.ts` | Modify | Recibir `JwtPayload`; aplicar filtro `doctorId` si `role === 'doctor'` |
| `src/medical-records/medical-records.service.spec.ts` | Modify | Actualizar mocks para incluir `doctorId` en tests de `findPaidConsultations` |
| `src/stores/auth.store.ts` (web) | Modify | Agregar `doctorId: string \| null` y persistir desde login |
| `src/config/navigation.config.ts` (web) | Modify | Agregar prop `roles` o `hideForRoles` a `NavItem`; filtrar en `useSidebarNav` |

## Interfaces / Contracts

```typescript
// JwtPayload (modificado)
export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  doctorId: string | null;  // NUEVO
  permissions: Array<{ resource: string; action: string }>;
  roleVersion: number;
}

// AuthStore (modificado)
interface AuthState {
  userId: string | null;
  email: string | null;
  role: string | null;
  doctorId: string | null;  // NUEVO
  permissions: Permission[];
  // ...
}

// NavItem (modificado)
interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission: NavPermission;
  visibleForRoles?: string[];  // NUEVO: undefined = visible para todos
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | AuthService.login incluye `doctorId` cuando `user.doctor` existe | Jest, mock Prisma `findMany` con `include: { doctor: true }` |
| Unit | AuthService.login pone `doctorId: null` cuando no hay relación | Jest, mock sin `doctor` en include result |
| Unit | MedicalRecordsService.findPaidConsultations filtra por `doctorId` | Jest, pasar `JwtPayload` con `role: 'doctor'` y `doctorId` seteado |
| Unit | MedicalRecordsService.findPaidConsultations NO filtra para admin | Jest, pasar `JwtPayload` con `role: 'admin'` y `doctorId: null` |
| Integration | Seeders crean User-Doctor vinculados | Prisma seed script en Docker, `make setup` |
| E2E (manual) | Doctor logueado solo ve sus consultas en `/consultas` | Login con doctor seed → verificar tabla |

## Migration / Rollout

1. **Migración 1**: `prisma migrate dev` agrega `Doctor.userId` nullable.
2. **Seeds**: Reescribir `users.seeder.ts` y `doctors.seeder.ts` para crear demo doctors con `User` vinculado.
3. **Verificación**: `make setup` ejecuta seeds; `GET /medical-records/paid-consultations` con login de doctor devuelve solo sus consultas.
4. **Rollback**: Revertir migración con `prisma migrate dev --create-only` o `prisma migrate rollback`. Los seeds se pueden re-ejecutar desde cero con `make down-v && make setup`.

## Decisions Resolved

- **Rol del doctor en código**: `'doctor'` (minúscula) para slugs, JWT payload, y comparaciones. En UI se muestra como "Doctor".
- **Doctor sin usuario**: `Doctor.userId` permanece **nullable**. El admin puede crear un doctor sin `User` asociado. Desde el panel de admin se habilitará un botón "Enviar onboarding" (Change 3) que crea el `User` + envía email de activación. Esto permite onboarding diferido.
