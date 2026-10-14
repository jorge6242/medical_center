import type { Consultation, PrismaClient, User } from '@prisma/client';

export async function seedDemoPayments(
  prisma: PrismaClient,
  consultations: Consultation[],
  users: { admin: User; reception: User },
  tenantId: string,
): Promise<void> {
  const completed = await prisma.payment.findMany({
    where: { consultation: { tenantId }, status: 'COMPLETED' },
    include: { consultation: true },
  });

  for (const payment of completed) {
    await prisma.paymentAdjustment.upsert({
      where: { id: `${payment.id}-adj-001` },
      update: {},
      create: {
        id: `${payment.id}-adj-001`,
        paymentId: payment.id,
        description: 'Descuento demo',
        amountUsd: 5,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: consultations.map((consultation) => ({
      tenantId,
      userId: users.admin.id,
      action: 'SEED_DEMO',
      entity: 'Consultation',
      entityId: consultation.id,
      oldValues: undefined,
      newValues: undefined,
      changedFields: [],
    })),
    skipDuplicates: true,
  });
}
