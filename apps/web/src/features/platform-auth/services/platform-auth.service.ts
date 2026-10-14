import { apiJson } from '@/config/api';

export interface PlatformSession {
  id: string;
  username: string;
  name: string;
  csrfToken: string;
}

export interface PlatformLoginDto {
  username: string;
  password: string;
}

// El header custom exigido por la API (2.4) impide CSRF desde otro origen.
const PLATFORM_REQUEST_HEADERS = { 'x-platform-request': '1' };

export const platformLogin = (dto: PlatformLoginDto): Promise<PlatformSession> =>
  apiJson('/platform/auth/login', {
    method: 'POST',
    headers: PLATFORM_REQUEST_HEADERS,
    body: JSON.stringify(dto),
  });

export const platformMe = (): Promise<PlatformSession> => apiJson('/platform/auth/me');

export const platformLogout = (csrfToken: string): Promise<{ message: string }> =>
  apiJson('/platform/auth/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
  });
