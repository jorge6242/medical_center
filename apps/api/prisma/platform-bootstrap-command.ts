export const PLATFORM_ADMIN_DEFAULT_USERNAME = 'exiadmin';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface PlatformBootstrapInput {
  username: string;
  password: string;
  overwrite: boolean;
}

// Entrada por stdin: línea 1 usuario, línea 2 clave, línea 3 confirmación (y/n).
// La clave nunca se incluye en mensajes de error.
export function parsePlatformBootstrapInput(
  lines: string[],
): PlatformBootstrapInput {
  const username = (lines[0] ?? '').trim() || PLATFORM_ADMIN_DEFAULT_USERNAME;
  const password = lines[1] ?? '';
  const overwrite = (lines[2] ?? '').trim().toLowerCase() === 'y';

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'username must be 3-32 lowercase letters, digits, dots, dashes or underscores',
    );
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error('password must be between 8 and 128 characters');
  }

  return { username, password, overwrite };
}
