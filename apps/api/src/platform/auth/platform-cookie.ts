// Cookie host-only: sin Domain, para que no se comparta con subdominios de centros.
export function platformCookieOptions(nodeEnv?: string) {
  const env = nodeEnv ?? process.env['NODE_ENV'];
  return {
    httpOnly: true,
    secure: env === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}
