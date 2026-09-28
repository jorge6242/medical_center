import { type NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = 'goratechlabs.com';

export function middleware(request: NextRequest): NextResponse {
  const hostname = request.headers.get('host') ?? '';
  const host = hostname.split(':')[0] ?? '';

  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  const isSubdomain = host.endsWith(`.${ROOT_DOMAIN}`);

  if (isRootDomain) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  if (isSubdomain) {
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
