import { PlatformDashboardService } from './platform-dashboard.service';

function buildPrisma() {
  return {
    tenant: { count: jest.fn() },
    tenantSubscription: { groupBy: jest.fn() },
    subscriptionInvoice: { aggregate: jest.fn() },
    subscriptionPayment: { aggregate: jest.fn() },
  };
}

describe('PlatformDashboardService', () => {
  it('reports operational and commercial totals only, no clinical data', async () => {
    const prisma = buildPrisma();
    prisma.tenant.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prisma.tenantSubscription.groupBy.mockResolvedValue([
      { status: 'ACTIVE', _count: { _all: 2 } },
      { status: 'PAST_DUE', _count: { _all: 1 } },
    ]);
    prisma.subscriptionInvoice.aggregate.mockResolvedValue({
      _sum: { totalUsd: '75.00' },
    });
    prisma.subscriptionPayment.aggregate
      .mockResolvedValueOnce({ _sum: { amountUsd: '25.00' } })
      .mockResolvedValueOnce({ _sum: { amountUsd: '40.00' } });

    const summary = await new PlatformDashboardService(prisma as never).summary(
      new Date('2026-10-12T15:00:00.000Z'),
    );

    expect(summary).toEqual({
      tenants: { active: 3, inactive: 1 },
      subscriptionsByStatus: { ACTIVE: 2, PAST_DUE: 1 },
      pendingBalanceUsd: '50.00',
      confirmedRevenueMonthUsd: '40.00',
      month: {
        from: '2026-10-01T04:00:00.000Z',
        to: '2026-11-01T04:00:00.000Z',
      },
    });
  });

  it('counts revenue only for confirmed payments inside the Caracas month', async () => {
    const prisma = buildPrisma();
    prisma.tenant.count.mockResolvedValue(0);
    prisma.tenantSubscription.groupBy.mockResolvedValue([]);
    prisma.subscriptionInvoice.aggregate.mockResolvedValue({
      _sum: { totalUsd: null },
    });
    prisma.subscriptionPayment.aggregate.mockResolvedValue({
      _sum: { amountUsd: null },
    });

    const summary = await new PlatformDashboardService(prisma as never).summary(
      new Date('2026-10-12T15:00:00.000Z'),
    );

    const revenueWhere =
      prisma.subscriptionPayment.aggregate.mock.calls[1]?.[0]?.where;
    expect(revenueWhere).toEqual({
      status: 'CONFIRMED',
      confirmedAt: {
        gte: new Date('2026-10-01T04:00:00.000Z'),
        lt: new Date('2026-11-01T04:00:00.000Z'),
      },
    });
    expect(summary.pendingBalanceUsd).toBe('0.00');
    expect(summary.confirmedRevenueMonthUsd).toBe('0.00');
  });
});

describe('PlatformDashboardService outstanding balance', () => {
  it.each([
    { invoices: [{ status: 'OVERDUE', totalUsd: 30 }], expected: '30.00' },
    {
      invoices: [
        { status: 'PENDING', totalUsd: 10 },
        { status: 'OVERDUE', totalUsd: 20 },
        { status: 'PAID', totalUsd: 90 },
        { status: 'VOIDED', totalUsd: 50 },
      ],
      expected: '30.00',
    },
  ])(
    'includes overdue invoices but not paid/voided totals',
    async ({ invoices, expected }) => {
      const prisma = buildPrisma();
      prisma.tenant.count.mockResolvedValue(0);
      prisma.tenantSubscription.groupBy.mockResolvedValue([]);
      prisma.subscriptionInvoice.aggregate.mockImplementation(
        async (query: { where: { status: { in: string[] } } }) => ({
          _sum: {
            totalUsd: String(
              invoices
                .filter((invoice) =>
                  query.where.status.in.includes(invoice.status),
                )
                .reduce((sum, invoice) => sum + invoice.totalUsd, 0),
            ),
          },
        }),
      );
      prisma.subscriptionPayment.aggregate.mockResolvedValue({
        _sum: { amountUsd: null },
      });
      const summary = await new PlatformDashboardService(
        prisma as never,
      ).summary(new Date('2026-10-12T15:00:00Z'));
      expect(summary.pendingBalanceUsd).toBe(expected);
    },
  );
});
