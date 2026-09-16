import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Permanent-redirect legacy `/r/:slug` share links onto `/restaurants/:slug`. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith('/r/')) return NextResponse.next();

  const slug = pathname.slice('/r/'.length);
  if (!slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/restaurants/${slug}`;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/r/:path*'],
};
