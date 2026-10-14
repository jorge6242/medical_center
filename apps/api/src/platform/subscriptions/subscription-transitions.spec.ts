import { ConflictException, BadRequestException } from '@nestjs/common';

import { assertTransition, canTransition } from './subscription-transitions';

describe('subscription status transitions', () => {
  it('allows only the transitions defined in the design', () => {
    expect(canTransition('TRIALING', 'ACTIVE')).toBe(true);
    expect(canTransition('TRIALING', 'CANCELED')).toBe(true);
    expect(canTransition('ACTIVE', 'PAST_DUE')).toBe(true);
    expect(canTransition('ACTIVE', 'SUSPENDED')).toBe(true);
    expect(canTransition('ACTIVE', 'CANCELED')).toBe(true);
    expect(canTransition('PAST_DUE', 'ACTIVE')).toBe(true);
    expect(canTransition('PAST_DUE', 'SUSPENDED')).toBe(true);
    expect(canTransition('SUSPENDED', 'ACTIVE')).toBe(true);
    expect(canTransition('SUSPENDED', 'CANCELED')).toBe(true);
  });

  it('treats CANCELED as terminal and rejects same-state or skipped transitions', () => {
    expect(canTransition('CANCELED', 'ACTIVE')).toBe(false);
    expect(canTransition('CANCELED', 'SUSPENDED')).toBe(false);
    expect(canTransition('ACTIVE', 'ACTIVE')).toBe(false);
    expect(canTransition('TRIALING', 'PAST_DUE')).toBe(false);
    expect(canTransition('SUSPENDED', 'PAST_DUE')).toBe(false);
  });

  it('requires a non-empty reason and reports invalid moves as conflict', () => {
    expect(() => assertTransition('ACTIVE', 'SUSPENDED', '  ')).toThrow(
      BadRequestException,
    );
    expect(() => assertTransition('CANCELED', 'ACTIVE', 'motivo')).toThrow(
      ConflictException,
    );
    expect(() =>
      assertTransition('ACTIVE', 'SUSPENDED', 'Mora confirmada'),
    ).not.toThrow();
  });
});
