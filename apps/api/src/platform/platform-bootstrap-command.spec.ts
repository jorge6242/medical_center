import {
  parsePlatformBootstrapInput,
  PLATFORM_ADMIN_DEFAULT_USERNAME,
} from '../../prisma/platform-bootstrap-command';

describe('platform bootstrap input', () => {
  it('accepts a username and a password of at least eight characters', () => {
    expect(
      parsePlatformBootstrapInput(['exiadmin', 'Exirion.05*', 'n']),
    ).toEqual({
      username: 'exiadmin',
      password: 'Exirion.05*',
      overwrite: false,
    });
  });

  it('uses the default username when the first line is empty', () => {
    expect(parsePlatformBootstrapInput(['', 'Exirion.05*', 'n']).username).toBe(
      PLATFORM_ADMIN_DEFAULT_USERNAME,
    );
  });

  it('marks overwrite only when the explicit confirmation line is y', () => {
    expect(
      parsePlatformBootstrapInput(['exiadmin', 'Exirion.05*', 'y']).overwrite,
    ).toBe(true);
    expect(
      parsePlatformBootstrapInput(['exiadmin', 'Exirion.05*']).overwrite,
    ).toBe(false);
  });

  it('rejects usernames that are not lowercase slugs', () => {
    expect(() =>
      parsePlatformBootstrapInput(['Ex Admin', 'Exirion.05*', 'n']),
    ).toThrow('username');
    expect(() =>
      parsePlatformBootstrapInput(['ab', 'Exirion.05*', 'n']),
    ).toThrow('username');
  });

  it('rejects passwords shorter than eight or longer than 128 characters', () => {
    expect(() =>
      parsePlatformBootstrapInput(['exiadmin', 'short', 'n']),
    ).toThrow('password');
    expect(() =>
      parsePlatformBootstrapInput(['exiadmin', 'a'.repeat(129), 'n']),
    ).toThrow('password');
  });

  it('never echoes the password in error messages', () => {
    let message = '';
    try {
      parsePlatformBootstrapInput(['Bad Name', 'Exirion.05*', 'n']);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('username');
    expect(message).not.toContain('Exirion.05*');
  });
});
