import { ForbiddenException, type ExecutionContext } from '@nestjs/common';

import { csrfTokenFor } from './platform-csrf';
import { PlatformCsrfGuard } from './platform-csrf.guard';

const SECRET = 'platform_secret_minimo_32_caracteres_aaaa';
const ORIGIN = 'https://admin.goratechlabs.com';

function contextFor(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('PlatformCsrfGuard', () => {
  let guard: PlatformCsrfGuard;

  beforeEach(() => {
    guard = new PlatformCsrfGuard([ORIGIN], SECRET);
  });

  it('lets safe methods through without origin checks', () => {
    expect(guard.canActivate(contextFor({ method: 'GET', headers: {} }))).toBe(
      true,
    );
  });

  it('rejects mutations without an Origin header', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ method: 'POST', headers: { 'x-platform-request': '1' } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects mutations from a foreign or lookalike origin', () => {
    for (const origin of [
      'https://evil.example.com',
      'https://admin.goratechlabs.com.evil.com',
      'http://admin.goratechlabs.com',
    ]) {
      expect(() =>
        guard.canActivate(
          contextFor({
            method: 'POST',
            headers: { origin, 'x-platform-request': '1' },
          }),
        ),
      ).toThrow(ForbiddenException);
    }
  });

  it('requires the custom header on login, where there is no session yet', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ method: 'POST', headers: { origin: ORIGIN } }),
      ),
    ).toThrow(ForbiddenException);

    expect(
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: { origin: ORIGIN, 'x-platform-request': '1' },
        }),
      ),
    ).toBe(true);
  });

  it('requires the session-bound CSRF token on authenticated mutations', () => {
    const platformAdmin = { id: 'admin-1', sessionId: 'sess-1' };
    const token = csrfTokenFor('sess-1', SECRET);

    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: { origin: ORIGIN, 'x-csrf-token': 'forged' },
          platformAdmin,
        }),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: {
            origin: ORIGIN,
            'x-csrf-token': csrfTokenFor('sess-2', SECRET),
          },
          platformAdmin,
        }),
      ),
    ).toThrow(ForbiddenException);

    expect(
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: { origin: ORIGIN, 'x-csrf-token': token },
          platformAdmin,
        }),
      ),
    ).toBe(true);
  });
});
