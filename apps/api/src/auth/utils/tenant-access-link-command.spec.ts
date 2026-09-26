import {
  buildTenantAccessUrl,
  parseTenantAccessLinkCommand,
} from '../../../prisma/tenant-access-link-command';

describe('tenant access link command', () => {
  it('accepts a tenant slug and applies a seven-day expiry by default', () => {
    expect(
      parseTenantAccessLinkCommand(['--slug', 'centro-medico-demo']),
    ).toEqual({
      tenantSlug: 'centro-medico-demo',
      expiresInDays: 7,
    });
  });

  it('accepts a custom expiry period', () => {
    expect(
      parseTenantAccessLinkCommand([
        '--slug',
        'centro-medico-demo',
        '--expires-days',
        '14',
      ]),
    ).toEqual({ tenantSlug: 'centro-medico-demo', expiresInDays: 14 });
  });

  it('rejects a missing slug and invalid expiry periods', () => {
    expect(() => parseTenantAccessLinkCommand([])).toThrow(
      '--slug is required',
    );
    expect(() =>
      parseTenantAccessLinkCommand(['--slug', 'demo', '--expires-days', '0']),
    ).toThrow('between 1 and 365');
  });

  it('builds an encoded login URL without duplicate slashes', () => {
    expect(
      buildTenantAccessUrl('https://web.example.com/', 'token with spaces'),
    ).toBe('https://web.example.com/login?access=token%20with%20spaces');
  });
});
