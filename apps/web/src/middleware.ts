import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isMongoObjectId } from '@reservations/shared';

/** Canonicalize public restaurant URLs onto `/r/:slug` (except ObjectId lookups). */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith('/restaurants/')) return NextResponse.next();

  const id = pathname.slice('/restaurants/'.length).split('/')[0] ?? '';
  if (!id || isMongoObjectId(id)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/r/${id}`;
  url.search = search;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/restaurants/:path*'],
};
