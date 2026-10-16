import type { LoginResponse, TenantAccessContext } from '@/features/auth/services/auth.service';

export const loginContextFixture: TenantAccessContext = {
  contextToken: 'synthetic-context',
  tenant: { name: 'Centro de prueba', slug: 'centro-test', logoUrl: null },
};

export const loginResponseFixture: LoginResponse = {
  userId: 'user-test',
  email: 'usuario@example.test',
  role: 'RECEPTIONIST',
  roleVersion: 1,
  doctorId: null,
  permissions: [{ resource: 'patients', action: 'read' }],
};
