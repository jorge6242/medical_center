import { validateWebSlug } from './tenant-web-slug';

describe('validateWebSlug', () => {
  it('accepts lowercase DNS labels with inner hyphens', () => {
    expect(validateWebSlug('centro-norte')).toBe('centro-norte');
    expect(validateWebSlug('clinica2')).toBe('clinica2');
  });

  it('rejects uppercase, spaces, leading or trailing hyphens and out-of-range lengths', () => {
    for (const value of [
      'Centro',
      'centro norte',
      '-centro',
      'centro-',
      'ab',
      'a'.repeat(64),
    ]) {
      expect(() => validateWebSlug(value)).toThrow('webSlug');
    }
  });

  it('rejects reserved hosts used by the platform and infrastructure', () => {
    for (const value of ['admin', 'www', 'api']) {
      expect(() => validateWebSlug(value)).toThrow('reservado');
    }
  });
});
