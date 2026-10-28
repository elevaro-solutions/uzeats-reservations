import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIVATE_PREFIXES = [
  '/login',
  '/register',
  '/profile',
  '/reservations',
  '/reviews',
  '/messages',
  '/saved',
  '/waitlist',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/survey',
  '/billing',
  '/verify-email',
  '/invoice',
];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Legacy `/r/:slug` share links plus noindex on account routes. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/r/')) {
    const slug = pathname.slice('/r/'.length);
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/restaurants/${slug}`;
      url.search = search;
      return NextResponse.redirect(url, 308);
    }
  }

  if (isPrivatePath(pathname)) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/r/:path*',
    '/login',
    '/login/:path*',
    '/register',
    '/register/:path*',
    '/profile/:path*',
    '/profile',
    '/reservations/:path*',
    '/reservations',
    '/reviews',
    '/reviews/:path*',
    '/messages/:path*',
    '/saved',
    '/saved/:path*',
    '/waitlist',
    '/waitlist/:path*',
    '/forgot-password',
    '/forgot-password/:path*',
    '/reset-password',
    '/reset-password/:path*',
    '/accept-invite',
    '/accept-invite/:path*',
    '/survey/:path*',
    '/billing',
    '/billing/:path*',
    '/verify-email',
    '/verify-email/:path*',
    '/invoice/:path*',
  ],
};
