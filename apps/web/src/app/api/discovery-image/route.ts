import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCachedMagnificStockPhotoUrl } from '@/lib/magnificStock';

export const runtime = 'nodejs';

const FALLBACK_FILE = path.join(process.cwd(), 'public/images/hero-restaurant.jpg');

async function fallbackImage(): Promise<NextResponse> {
  const bytes = await readFile(FALLBACK_FILE);
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('term')?.trim();
  if (!term) {
    return fallbackImage();
  }

  const stockUrl = await getCachedMagnificStockPhotoUrl(term);
  if (!stockUrl) {
    return fallbackImage();
  }

  try {
    const upstream = await fetch(stockUrl, {
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!upstream.ok || !upstream.body) {
      console.warn(`[magnific] CDN fetch failed (${upstream.status}) for ${stockUrl}`);
      return fallbackImage();
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.warn('[magnific] CDN fetch error:', err);
    return fallbackImage();
  }
}
