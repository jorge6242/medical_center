import { UsersService } from './users.service';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../database/prisma.service';

describe('UsersService.updateRole', () => {
  const prisma = {
    role: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  } as unknown as PrismaService;
  const auditLog = { log: jest.fn() } as unknown as AuditLogService;
  const service = new UsersService(prisma, auditLog);

  beforeEach(() => jest.clearAllMocks());

  it('updates the user details and role and records the changes', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Ana',
      lastName: 'Pérez',
      identificationNumber: null,
      roleId: 'role-reception',
      role: { id: 'role-reception', name: 'recepcionista' },
    });
    (prisma.role.findFirst as jest.Mock).mockResolvedValue({
      id: 'role-admin',
      name: 'admin',
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'ana.gomez@example.com',
      name: 'Ana María',
      lastName: 'Gómez',
      identificationNumber: 'V-12345678',
      isActive: true,
      createdAt: new Date('2026-09-27T00:00:00.000Z'),
      role: { id: 'role-admin', name: 'admin' },
    });

    await service.update('tenant-1', 'actor-1', 'user-1', {
      name: 'Ana María',
      lastName: 'Gómez',
      identificationNumber: 'V-12345678',
      email: 'ana.gomez@example.com',
      password: 'NuevaClave123',
      roleId: 'role-admin',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: 'Ana María',
        lastName: 'Gómez',
        identificationNumber: 'V-12345678',
        email: 'ana.gomez@example.com',
        roleId: 'role-admin',
        passwordHash: expect.any(String),
      }),
      include: { role: { select: { id: true, name: true } } },
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity: 'User',
        tenantId: 'tenant-1',
        oldValues: expect.objectContaining({
          email: 'user@example.com',
          role: 'recepcionista',
        }),
        newValues: expect.objectContaining({
          email: 'ana.gomez@example.com',
          role: 'admin',
        }),
        changedFields: expect.arrayContaining(['email', 'name', 'role']),
      }),
      prisma,
    );
  });
});
