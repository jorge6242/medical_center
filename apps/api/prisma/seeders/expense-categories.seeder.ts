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

export async function seedExpenseCategories(prisma: PrismaClient): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.warn('✓ Categorías de egreso seeded');
}
