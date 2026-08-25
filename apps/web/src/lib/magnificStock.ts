const MAGNIFIC_API_BASE = 'https://api.magnific.com/v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type MagnificResourceImage = {
  source?: {
    url?: string;
  };
};

type MagnificResource = {
  id?: number;
  title?: string;
  image?: MagnificResourceImage;
};

type MagnificSearchResponse = {
  data?: MagnificResource[];
};

type CacheEntry = { url?: string; expiresAt: number };

const memoryCache = new Map<string, CacheEntry>();

function magnificApiKey(): string | undefined {
  return process.env.MAGNIFIC_API_KEY?.trim() || undefined;
}

function pickImageUrl(resource: MagnificResource | undefined): string | undefined {
  const url = resource?.image?.source?.url?.trim();
  if (!url) return undefined;
  // Magnific CDN sometimes returns http:// — prefer https for server fetch.
  return url.replace(/^http:\/\//i, 'https://');
}

/** Search Magnific stock photos by keyword. */
export async function searchMagnificStockPhoto(term: string): Promise<string | undefined> {
  const apiKey = magnificApiKey();
  if (!apiKey) {
    console.warn('[magnific] MAGNIFIC_API_KEY is not set — using fallback images');
    return undefined;
  }

  const params = new URLSearchParams({
    term,
    page: '1',
    limit: '1',
    order: 'relevance',
  });
  params.append('filters[content_type][photo]', '1');
  params.append('filters[orientation][landscape]', '1');

  const response = await fetch(`${MAGNIFIC_API_BASE}/resources?${params.toString()}`, {
    headers: {
      'x-magnific-api-key': apiKey,
      Accept: 'application/json',
      'Accept-Language': 'en-US',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn(
      `[magnific] stock search failed (${response.status}) for "${term}": ${body.slice(0, 200)}`,
    );
    return undefined;
  }

  const payload = (await response.json()) as MagnificSearchResponse;
  return pickImageUrl(payload.data?.[0]);
}

export async function getCachedMagnificStockPhotoUrl(term: string): Promise<string | undefined> {
  const normalized = term.trim().toLowerCase();
  const cached = memoryCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const url = await searchMagnificStockPhoto(normalized);
    memoryCache.set(normalized, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
  } catch (err) {
    console.warn('[magnific] stock search error:', err);
    return undefined;
  }
}

export function discoveryImageProxyUrl(term: string): string {
  return `/api/discovery-image?term=${encodeURIComponent(term.trim())}`;
}
