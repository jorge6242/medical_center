export const AUDIT_ENTITIES = [
  'Patient',
  'Doctor',
  'MedicalRecord',
  'DoctorReceipt',
  'Payment',
  'Expense',
  'Consultation',
  'Specialty',
  'TenantAccessLink',
  'Service',
  'User',
  'Role',
  'Permission',
  'Auth',
  'Onboarding',
  'Report',
  'SubscriptionPlan',
  'TenantSubscription',
  'SubscriptionPeriod',
  'SubscriptionInvoice',
] as const;

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DEACTIVATE',
  'COMPLETE',
  'ADJUSTMENT',
  'VOID',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'SEND',
  'VERIFY',
  'EXPORT',
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isCatalogedAction(action: string, entity: string): boolean {
  return (
    AUDIT_ACTIONS.includes(action as AuditAction) &&
    AUDIT_ENTITIES.includes(entity as AuditEntity)
  );
}
