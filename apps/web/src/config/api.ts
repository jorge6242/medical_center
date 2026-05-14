const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const isServer = typeof window === 'undefined';

  let cookieHeader = '';
  if (isServer) {
    const { cookies } = await import('next/headers');
    cookieHeader = (await cookies()).toString();
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(isServer ? { Cookie: cookieHeader } : {}),
    ...init?.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: isServer ? undefined : 'include',
  });

  if (!isServer && res.status === 401) {
    window.location.href = '/login';
  }

  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
