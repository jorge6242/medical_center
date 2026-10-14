const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const isServer = typeof window === 'undefined';
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  let cookieHeader = '';
  if (isServer) {
    const { cookies } = await import('next/headers');
    cookieHeader = (await cookies()).toString();
  }

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(isServer ? { Cookie: cookieHeader } : {}),
    ...init?.headers,
  };

  const isPlatformRequest = path === '/platform' || path.startsWith('/platform/');
  const url = !isServer && isPlatformRequest ? `/api${path}` : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: isServer ? undefined : 'include',
  });

  if (!isServer && res.status === 401) {
    redirectToLogin(path);
  }

  return res;
}

// El realm plataforma tiene su propio login; evitamos el bucle si ya estamos ahí.
function redirectToLogin(apiPath: string): void {
  const { pathname } = window.location;
  if (apiPath.startsWith('/platform')) {
    if (pathname.startsWith('/platform/login')) return;
    window.dispatchEvent(new CustomEvent('platform-session-expired'));
    return;
  }
  window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { responseType?: 'json' | 'blob' },
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { message?: string }).message ?? `HTTP ${res.status}`, res.status);
  }
  if (init?.responseType === 'blob') {
    return res.blob() as Promise<T>;
  }
  return res.json() as Promise<T>;
}
