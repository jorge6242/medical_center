import { apiJson } from '@/config/api';

export interface LoginDto {
  email: string;
  password: string;
  contextToken: string;
}

export interface TenantAccessContext {
  contextToken: string;
  tenant: { name: string; slug?: string; logoUrl: string | null };
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: string;
  roleVersion: number;
  doctorId: string | null;
  permissions: Array<{ resource: string; action: string }>;
}

export const login = (dto: LoginDto): Promise<LoginResponse> =>
  apiJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dto),
  });

export const resolveAccessContext = (accessToken: string): Promise<TenantAccessContext> =>
  apiJson('/auth/access-context', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });

export const resolveByWebSlug = (webSlug: string): Promise<TenantAccessContext> =>
  apiJson(`/auth/tenant-by-webslug/${encodeURIComponent(webSlug)}`);

export const logout = (): Promise<void> => apiJson('/auth/logout', { method: 'POST' });
