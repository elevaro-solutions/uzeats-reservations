import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Proxies discovery stock thumbnails from the diner web app so dashboard
 * previews work same-origin (and pick up MAGNIFIC_API_KEY configured there).
 */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('term')?.trim();
  if (!term) {
    return new NextResponse('Missing term', { status: 400 });
  }

  const webBase = (
    process.env.NEXT_PUBLIC_WEB_URL ||
    process.env.WEB_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  try {
    const upstream = await fetch(
      `${webBase}/api/discovery-image?term=${encodeURIComponent(term)}`,
      { cache: 'no-store' },
    );
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Stock image unavailable', { status: 502 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse('Stock image proxy failed', { status: 502 });
  }
}
