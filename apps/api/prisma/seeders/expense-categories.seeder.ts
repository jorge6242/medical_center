import type { PrismaClient } from '@prisma/client';

const CATEGORIES = [
  'Papelería',
  'Limpieza',
  'Cafetería',
  'Servicios públicos',
  'Insumos médicos',
  'Mantenimiento',
  'Otro',
];

export async function seedExpenseCategories(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
    });
  }

  console.warn('✓ Categorías de egreso seeded');
}
