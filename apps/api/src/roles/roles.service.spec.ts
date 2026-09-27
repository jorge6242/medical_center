import { RolesService } from './roles.service';

import type { PrismaService } from '../database/prisma.service';

describe('RolesService', () => {
  const prisma = {
    role: { findMany: jest.fn() },
  } as unknown as PrismaService;
  const service = new RolesService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('returns only public role and permission fields', async () => {
    (prisma.role.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'role-1',
        name: 'doctor',
        permissions: [{ resource: 'consultations', action: 'read' }],
      },
    ]);

    const result = await service.findAllRoles('tenant-1');

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        permissions: { select: { id: true, resource: true, action: true } },
      },
      orderBy: { name: 'asc' },
    });
    expect(result[0]).toEqual({
      id: 'role-1',
      name: 'doctor',
      permissions: [{ resource: 'consultations', action: 'read' }],
    });
  });
});
