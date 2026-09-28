import type { Prisma, PrismaClient } from '@prisma/client';

export async function seedReminderConfig(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
): Promise<void> {
  await prisma.reminderConfig.upsert({
    where: { tenantId_type: { tenantId, type: 'APPOINTMENT' } },
    update: {},
    create: {
      tenantId,
      type: 'APPOINTMENT',
      isActive: true,
      sendToPatient: true,
      sendToDoctor: true,
      sendToAdmin: false,
      hoursBefore: 24,
      daysBefore: null,
    },
  });

  await prisma.reminderConfig.upsert({
    where: { tenantId_type: { tenantId, type: 'BIRTHDAY' } },
    update: {},
    create: {
      tenantId,
      type: 'BIRTHDAY',
      isActive: true,
      sendToPatient: true,
      sendToDoctor: false,
      sendToAdmin: true,
      hoursBefore: null,
      daysBefore: 0,
    },
  });

  console.warn('✓ Reminder config seeded');
}
