import { DEMO_TENANT_ID } from './types';

import type { PrismaClient, User } from '@prisma/client';


export async function seedDemoExpenses(prisma: PrismaClient, users: { admin: User; reception: User }): Promise<void> {
  const categories = await prisma.expenseCategory.findMany();
  const category = categories[0];

  if (!category) return;

  await prisma.expense.upsert({
    where: { id: 'demo-expense-001' },
    update: {},
    create: {
      id: 'demo-expense-001',
      tenantId: DEMO_TENANT_ID,
      categoryId: category.id,
      categoryName: category.name,
      description: 'Insumos médicos demo',
      amountUsd: 120,
      amountBs: 4380,
      status: 'ACTIVE',
      voidedBy: null,
      voidReason: null,
    },
  });

  await prisma.expense.upsert({
    where: { id: 'demo-expense-002' },
    update: {},
    create: {
      id: 'demo-expense-002',
      tenantId: DEMO_TENANT_ID,
      categoryId: category.id,
      categoryName: category.name,
      description: 'Servicios públicos demo',
      amountUsd: 80,
      amountBs: 2920,
      status: 'ACTIVE',
      voidedBy: null,
      voidReason: null,
    },
  });

  void users;
}
