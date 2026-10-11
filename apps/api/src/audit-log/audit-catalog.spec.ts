import { isCatalogedAction } from './audit-catalog';

describe('audit catalog', () => {
  it.each([
    'SubscriptionPlan',
    'TenantSubscription',
    'SubscriptionPeriod',
    'SubscriptionInvoice',
  ])('accepts subscription creation for %s', (entity) =>
    expect(isCatalogedAction('CREATE', entity)).toBe(true),
  );
  it('accepts supported domain actions', () =>
    expect(isCatalogedAction('VOID', 'Payment')).toBe(true));
  it('rejects arbitrary actions and entities', () =>
    expect(isCatalogedAction('DROP', 'Unknown')).toBe(false));
});
