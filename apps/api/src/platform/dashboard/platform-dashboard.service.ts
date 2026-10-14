import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { billingPeriodFor } from '../tenants/platform-tenant-provisioning';

// Sólo agregados operativos y comerciales: nada clínico, nada por paciente.
const OPEN_INVOICE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as const;

export interface PlatformDashboardSummary {
  tenants: { active: number; inactive: number };
  subscriptionsByStatus: Record<string, number>;
  pendingBalanceUsd: string;
  confirmedRevenueMonthUsd: string;
  month: { from: string; to: string };
}

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(now: Date = new Date()): Promise<PlatformDashboardSummary> {
    const month = billingPeriodFor(now.toISOString());

    const active = await this.prisma.tenant.count({
      where: { isActive: true },
    });
    const inactive = await this.prisma.tenant.count({
      where: { isActive: false },
    });
    const byStatus = await this.prisma.tenantSubscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const openTotal = await this.prisma.subscriptionInvoice.aggregate({
      where: { status: { in: [...OPEN_INVOICE_STATUSES] } },
      _sum: { totalUsd: true },
    });
    const openPaid = await this.prisma.subscriptionPayment.aggregate({
      where: {
        status: 'CONFIRMED',
        subscriptionInvoice: { status: { in: [...OPEN_INVOICE_STATUSES] } },
      },
      _sum: { amountUsd: true },
    });
    const revenue = await this.prisma.subscriptionPayment.aggregate({
      where: {
        status: 'CONFIRMED',
        confirmedAt: { gte: month.startsAt, lt: month.endsAt },
      },
      _sum: { amountUsd: true },
    });

    return {
      tenants: { active, inactive },
      subscriptionsByStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
      pendingBalanceUsd: decimalText(openTotal._sum.totalUsd)
        .minus(decimalText(openPaid._sum.amountUsd))
        .toFixed(2),
      confirmedRevenueMonthUsd: decimalText(revenue._sum.amountUsd).toFixed(2),
      month: {
        from: month.startsAt.toISOString(),
        to: month.endsAt.toISOString(),
      },
    };
  }
}

function decimalText(
  value: Prisma.Decimal | string | null | undefined,
): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0);
}
