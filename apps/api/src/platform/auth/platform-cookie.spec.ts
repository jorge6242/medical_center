import { PLATFORM_ACCESS_COOKIE } from './platform-auth.constants';
import { platformCookieOptions } from './platform-cookie';

describe('platform cookie', () => {
  it('uses its own name, distinct from the tenant access_token cookie', () => {
    expect(PLATFORM_ACCESS_COOKIE).toBe('platform_access_token');
    expect(PLATFORM_ACCESS_COOKIE).not.toBe('access_token');
  });

  it('is host-only (no Domain), httpOnly, path / and lax', () => {
    const options = platformCookieOptions('production');

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(options).not.toHaveProperty('domain');
  });

  it('drops Secure only outside production', () => {
    expect(platformCookieOptions('development').secure).toBe(false);
  });
});
