import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function webBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_WEB_URL ||
    process.env.WEB_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/** Proxy Magnific stock search from the diner web app (holds MAGNIFIC_API_KEY). */
export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const term = incoming.searchParams.get('term')?.trim();
  if (!term) {
    return NextResponse.json({ ok: false, error: 'Missing term' }, { status: 400 });
  }

  const page = incoming.searchParams.get('page') ?? '1';
  const upstreamUrl = `${webBaseUrl()}/api/discovery-magnific/search?term=${encodeURIComponent(term)}&page=${encodeURIComponent(page)}`;

  try {
    const upstream = await fetch(upstreamUrl, { cache: 'no-store' });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Magnific search proxy failed' }, { status: 502 });
  }
}
