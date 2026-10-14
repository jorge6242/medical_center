import { type NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = 'goratechlabs.com';
const ADMIN_HOST = `admin.${ROOT_DOMAIN}`;
const PLATFORM_PREFIX = '/platform';

export function middleware(request: NextRequest): NextResponse {
  const hostname = request.headers.get('host') ?? '';
  const host = hostname.split(':')[0] ?? '';

  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  const isSubdomain = host.endsWith(`.${ROOT_DOMAIN}`);

  if (isRootDomain) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  const path = request.nextUrl.pathname;
  const isPlatformPath = path === PLATFORM_PREFIX || path.startsWith(`${PLATFORM_PREFIX}/`);
  const isPlatformApiPath = path === '/api/platform' || path.startsWith('/api/platform/');

  // Host de plataforma: sólo rutas /platform; ninguna pantalla clínica.
  if (host === ADMIN_HOST) {
    if (isPlatformPath || isPlatformApiPath) return NextResponse.next();
    return NextResponse.redirect(new URL('/platform/login', request.url));
  }

  if (isSubdomain) {
    // Los centros nunca sirven el panel global.
    if (isPlatformPath || isPlatformApiPath)
      return NextResponse.redirect(new URL('/login', request.url));

    const webSlug = host.replace(`.${ROOT_DOMAIN}`, '');
    const token = request.cookies.get('access_token')?.value;

    if (token) {
      try {
        const payloadStr = token.split('.')[1];
        if (payloadStr) {
          // Edge compatible base64 decode
          const decoded = atob(payloadStr);
          const payload = JSON.parse(decoded);

          if (payload.webSlug && payload.webSlug !== webSlug) {
            // JWT does not match this subdomain -> clear cookie and force login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('access_token');
            return response;
          }
        }
      } catch {
        // Ignore parsing errors, let API handle invalid tokens
      }
    }

    const response = NextResponse.next();
    response.headers.set('x-tenant-web-slug', webSlug);
    return response;
  }

  // localhost, *.railway.app, etc. → ?access= flow (dev / staging)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
