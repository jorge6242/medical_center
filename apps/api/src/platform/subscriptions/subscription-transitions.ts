import { BadRequestException, ConflictException } from '@nestjs/common';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELED';

// Transiciones explícitas de design.md §5. CANCELED es terminal en V1.
const TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  TRIALING: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['PAST_DUE', 'SUSPENDED', 'CANCELED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'CANCELED'],
  SUSPENDED: ['ACTIVE', 'CANCELED'],
  CANCELED: [],
};

export function canTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
  reason: string,
): void {
  if (!reason.trim()) throw new BadRequestException('El motivo es obligatorio');
  if (!canTransition(from, to)) {
    throw new ConflictException(`Transición no permitida: ${from} → ${to}`);
  }
}
