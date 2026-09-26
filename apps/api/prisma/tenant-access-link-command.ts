const DEFAULT_EXPIRY_DAYS = 7;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 365;

export interface TenantAccessLinkCommand {
  tenantSlug: string;
  expiresInDays: number;
}

export function parseTenantAccessLinkCommand(
  args: string[],
): TenantAccessLinkCommand {
  const tenantSlug = readOption(args, '--slug');
  if (!tenantSlug) {
    throw new Error('--slug is required');
  }

  const expiryValue = readOption(args, '--expires-days');
  const expiresInDays = expiryValue ? Number(expiryValue) : DEFAULT_EXPIRY_DAYS;
  if (
    !Number.isInteger(expiresInDays) ||
    expiresInDays < MIN_EXPIRY_DAYS ||
    expiresInDays > MAX_EXPIRY_DAYS
  ) {
    throw new Error('--expires-days must be an integer between 1 and 365');
  }

  return { tenantSlug, expiresInDays };
}

export function buildTenantAccessUrl(
  frontendUrl: string,
  accessToken: string,
): string {
  const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, '');
  return `${normalizedFrontendUrl}/login?access=${encodeURIComponent(accessToken)}`;
}

function readOption(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}
