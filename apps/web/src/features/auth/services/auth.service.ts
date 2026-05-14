import { apiJson } from '@/config/api';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: string;
  permissions: Array<{ resource: string; action: string }>;
}

export const login = (dto: LoginDto): Promise<LoginResponse> =>
  apiJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dto),
  });

export const logout = (): Promise<void> =>
  apiJson('/auth/logout', { method: 'POST' });
