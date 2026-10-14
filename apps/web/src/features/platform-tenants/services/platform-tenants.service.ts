import { apiJson } from '@/config/api';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  webSlug: string | null;
  email: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListResult {
  items: PlatformTenant[];
  page: number;
  limit: number;
  total: number;
}

export interface TenantListParams {
  page: number;
  name?: string;
  isActive?: 'true' | 'false' | '';
}

export interface TenantUpdateDto {
  name?: string;
  email?: string | null;
  webSlug?: string;
  expectedVersion: number;
}

export interface TenantActivationDto {
  isActive: boolean;
  reason: string;
  expectedVersion: number;
}

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  basePriceUsd: string;
}

export interface TenantCreateDto {
  name: string;
  slug: string;
  webSlug: string;
  email?: string;
  initialAdmin: { name: string; email: string; password: string };
  initialSubscription: {
    planCode: string;
    agreedPriceUsd: string;
    startsAt: string;
    dueAt: string;
    gracePeriodDays: number;
  };
}

// Mutaciones: el token CSRF viene de la sesión de plataforma (2.4).
const csrfHeaders = (csrfToken: string) => ({ 'x-csrf-token': csrfToken });

export const listPlatformTenants = (params: TenantListParams): Promise<TenantListResult> => {
  const query = new URLSearchParams({ page: String(params.page), limit: '20' });
  if (params.name) query.set('name', params.name);
  if (params.isActive) query.set('isActive', params.isActive);
  return apiJson(`/platform/tenants?${query.toString()}`);
};

export const getPlatformTenant = (id: string): Promise<PlatformTenant> =>
  apiJson(`/platform/tenants/${encodeURIComponent(id)}`);

export const listPlatformPlans = (): Promise<PlatformPlan[]> =>
  apiJson('/platform/subscription-plans');

export const updatePlatformTenant = (
  id: string,
  dto: TenantUpdateDto,
  csrfToken: string,
): Promise<PlatformTenant> =>
  apiJson(`/platform/tenants/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: csrfHeaders(csrfToken),
    body: JSON.stringify(dto),
  });

export const setPlatformTenantActivation = (
  id: string,
  dto: TenantActivationDto,
  csrfToken: string,
): Promise<PlatformTenant> =>
  apiJson(`/platform/tenants/${encodeURIComponent(id)}/activation`, {
    method: 'POST',
    headers: csrfHeaders(csrfToken),
    body: JSON.stringify(dto),
  });

// La clave de idempotencia la genera el formulario una vez: reintentos y doble clic no duplican.
export const createPlatformTenant = (
  dto: TenantCreateDto,
  idempotencyKey: string,
  csrfToken: string,
): Promise<{ tenant: PlatformTenant; replayed: boolean }> =>
  apiJson('/platform/tenants', {
    method: 'POST',
    headers: { ...csrfHeaders(csrfToken), 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(dto),
  });
