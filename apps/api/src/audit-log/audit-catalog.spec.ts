import { isCatalogedAction } from './audit-catalog';

describe('audit catalog', () => {
  it('accepts supported domain actions', () =>
    expect(isCatalogedAction('VOID', 'Payment')).toBe(true));
  it('rejects arbitrary actions and entities', () =>
    expect(isCatalogedAction('DROP', 'Unknown')).toBe(false));
});
