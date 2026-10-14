import { createHmac, timingSafeEqual } from 'node:crypto';

// Token derivado de la sesión: no se guarda en BD y cambia si la sesión se revoca.
export function csrfTokenFor(sessionId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`platform-csrf:${sessionId}`)
    .digest('hex');
}

export function tokensMatch(provided: string | undefined, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
