import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { subscriptionResponse } from './dto/tenant-subscription-response.dto';
import {
  subscriptionFixture,
  subscriptionPeriodFixture,
} from './subscription.fixtures';
import { PERMISSION_KEY } from '../common/decorators/require-permission.decorator';

describe('Tenant subscription summary', () => {
  const findUnique = jest.fn();
  const service = new AppConfigService(
    { tenantSubscription: { findUnique } } as never,
    {} as never,
    {} as never,
  );

  it('requires the configuration permission on the billing endpoint', () => {
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        AppConfigController.prototype.getSubscription,
      ),
    ).toEqual({
      resource: 'tenant_settings',
      action: 'update',
    });
  });

  it('returns null for an unprovisioned tenant and scopes the query', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.getSubscription('tenant-1')).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1' },
      }),
    );
  });

  it('serializes snapshots and confirmed payments without exposing Prisma', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
    const result = subscriptionResponse(subscriptionFixture);
    expect(result.coverageStatus).toBe('ACTIVE');
    expect(result.agreedPriceUsd).toBe('20.00');
    expect(result.currentPeriod?.invoice).toEqual({
      number: 'SUB-1',
      status: 'PARTIALLY_PAID',
      totalUsd: '20.00',
      confirmedPaidUsd: '7.50',
      balanceUsd: '12.50',
      dueAt: '2026-10-05T04:00:00.000Z',
    });
    expect(JSON.parse(JSON.stringify(result))).not.toHaveProperty('tenantId');
    jest.useRealTimers();
  });

  it('does not treat a billed month as active coverage', () => {
    const result = subscriptionResponse({
      ...subscriptionFixture,
      subscriptionPeriod: null,
    });
    expect(result.coverageStatus).toBe('UNASSIGNED');
    expect(result.currentPeriod).toBeNull();
    expect(result.latestPeriod?.planName).toBe('Base');
  });

  it.each([
    ['2026-09-30T12:00:00Z', 'SCHEDULED'],
    ['2026-11-01T04:00:00Z', 'EXPIRED'],
  ])('uses half-open coverage boundaries at %s', (now, status) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    expect(subscriptionResponse(subscriptionFixture).coverageStatus).toBe(
      status,
    );
    jest.useRealTimers();
  });

  it('keeps a suspended contract restricted', () => {
    expect(
      subscriptionResponse({ ...subscriptionFixture, status: 'SUSPENDED' })
        .coverageStatus,
    ).toBe('RESTRICTED');
  });

  it('selects only confirmed payments within the tenant relation', async () => {
    findUnique.mockResolvedValue(subscriptionFixture);
    await service.getSubscription('tenant-2');
    expect(findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-2' },
        select: expect.objectContaining({
          periods: expect.objectContaining({
            take: 1,
            select: expect.objectContaining({
              invoice: expect.objectContaining({
                select: expect.objectContaining({
                  payments: {
                    where: { status: 'CONFIRMED' },
                    select: { amountUsd: true },
                  },
                }),
              }),
            }),
          }),
        }),
      }),
    );
    expect(subscriptionPeriodFixture.invoice.payments).toHaveLength(1);
  });
});
