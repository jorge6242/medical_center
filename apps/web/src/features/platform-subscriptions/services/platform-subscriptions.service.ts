import { apiJson } from '@/config/api';

export type ContractStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';

export interface SubscriptionHistoryQuery {
  periodPage?: number;
  invoicePage?: number;
  paymentPage?: number;
  limit?: number;
}

export interface HistoryPagination {
  page: number;
  limit: number;
  total: number;
}

export interface PlatformContract {
  pagination: {
    periods: HistoryPagination;
    invoices: HistoryPagination;
    payments: HistoryPagination;
  };
  contract: {
    id: string;
    tenantId: string;
    status: ContractStatus;
    agreedPriceUsd: string;
    gracePeriodDays: number;
    promoExpiresAt: string | null;
    version: number;
    subscriptionPeriodId: string | null;
  };
  periods: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    priceUsdSnapshot: string;
    planCodeSnapshot: string;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    totalUsd: string;
    dueAt: string;
  }>;
  payments: Array<{
    id: string;
    subscriptionInvoiceId: string;
    status: 'CONFIRMED' | 'VOIDED' | 'PENDING';
    amountUsd: string;
    paymentCurrency: 'USD' | 'VES';
    amountPaid: string;
    paidAt: string;
  }>;
}

export interface ContractUpdateDto {
  agreedPriceUsd?: string;
  gracePeriodDays?: number;
  reason: string;
  expectedVersion: number;
}

export interface StatusChangeDto {
  status: ContractStatus;
  reason: string;
  expectedVersion: number;
}

export interface PeriodCreateDto {
  planCode: string;
  startsAt: string;
  dueAt: string;
}

export interface PaymentCreateDto {
  currency: 'USD' | 'VES';
  amountPaid: string;
  rate?: string;
  method: string;
  reference?: string;
  paidAt: string;
}

export interface AuditEntry {
  requestId: string | null;
  correlationId: string | null;
  id: string;
  platformAdminId: string | null;
  actorKind: string;
  targetTenantId: string | null;
  entity: string;
  entityId: string;
  action: string;
  changedFields: string[];
  result: string;
  reason: string | null;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
}

export interface AuditListResult {
  items: AuditEntry[];
  page: number;
  limit: number;
  total: number;
}

const base = (tenantId: string) => `/platform/tenants/${encodeURIComponent(tenantId)}/subscription`;
const csrf = (token: string) => ({ 'x-csrf-token': token });
const withKey = (token: string, key: string) => ({
  ...csrf(token),
  'Idempotency-Key': key,
});

export const getPlatformContract = (
  tenantId: string,
  params: SubscriptionHistoryQuery = {},
): Promise<PlatformContract> => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return apiJson(`${base(tenantId)}?${query.toString()}`);
};

export const updatePlatformContract = (
  tenantId: string,
  dto: ContractUpdateDto,
  token: string,
): Promise<PlatformContract> =>
  apiJson(base(tenantId), {
    method: 'PATCH',
    headers: csrf(token),
    body: JSON.stringify(dto),
  });

export const changePlatformContractStatus = (
  tenantId: string,
  dto: StatusChangeDto,
  token: string,
): Promise<PlatformContract> =>
  apiJson(`${base(tenantId)}/status`, {
    method: 'POST',
    headers: csrf(token),
    body: JSON.stringify(dto),
  });

export const createPlatformPeriod = (
  tenantId: string,
  dto: PeriodCreateDto,
  key: string,
  token: string,
) =>
  apiJson(`${base(tenantId)}/periods`, {
    method: 'POST',
    headers: withKey(token, key),
    body: JSON.stringify(dto),
  });

export const registerPlatformPayment = (
  tenantId: string,
  invoiceId: string,
  dto: PaymentCreateDto,
  key: string,
  token: string,
) =>
  apiJson(`${base(tenantId)}/invoices/${encodeURIComponent(invoiceId)}/payments`, {
    method: 'POST',
    headers: withKey(token, key),
    body: JSON.stringify(dto),
  });

export const voidPlatformPayment = (
  tenantId: string,
  paymentId: string,
  reason: string,
  key: string,
  token: string,
) =>
  apiJson(`${base(tenantId)}/payments/${encodeURIComponent(paymentId)}/void`, {
    method: 'POST',
    headers: withKey(token, key),
    body: JSON.stringify({ reason }),
  });

export const listPlatformAudit = (params: {
  page: number;
  targetTenantId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}): Promise<AuditListResult> => {
  const query = new URLSearchParams({ page: String(params.page), limit: '20' });
  if (params.targetTenantId) query.set('targetTenantId', params.targetTenantId);
  if (params.action) query.set('action', params.action);
  if (params.entity) query.set('entity', params.entity);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  return apiJson(`/platform/audit?${query.toString()}`);
};
