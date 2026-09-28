import { type NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = 'goratechlabs.com';

export function middleware(request: NextRequest): NextResponse {
  const hostname = request.headers.get('host') ?? '';
  // Strip port for local dev comparisons
  const host = hostname.split(':')[0] ?? '';

  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  const isSubdomain = host.endsWith(`.${ROOT_DOMAIN}`);

  if (isRootDomain) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  if (isSubdomain) {
    const webSlug = host.replace(`.${ROOT_DOMAIN}`, '');
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
