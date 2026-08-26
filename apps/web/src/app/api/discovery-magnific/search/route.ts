import { NextResponse } from 'next/server';
import { searchMagnificStockPhoto } from '@reservations/shared';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const term = url.searchParams.get('term')?.trim();
  if (!term) {
    return NextResponse.json({ ok: false, error: 'Missing term' }, { status: 400 });
  }

  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const photo = await searchMagnificStockPhoto(term, page);

  if (!photo) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.MAGNIFIC_API_KEY?.trim()
            ? 'No Magnific photos matched this search'
            : 'MAGNIFIC_API_KEY is not configured',
        term,
        page,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    term,
    page,
    id: photo.id,
    title: photo.title,
    imageUrl: photo.imageUrl,
  });
}
