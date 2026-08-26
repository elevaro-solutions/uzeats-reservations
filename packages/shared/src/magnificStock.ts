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

export type MagnificStockPhoto = {
  id?: number;
  title?: string;
  imageUrl: string;
};

function magnificApiKey(): string | undefined {
  return process.env.MAGNIFIC_API_KEY?.trim() || undefined;
}

function pickImageUrl(resource: MagnificResource | undefined): string | undefined {
  const url = resource?.image?.source?.url?.trim();
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, 'https://');
}

function mapResource(resource: MagnificResource | undefined): MagnificStockPhoto | undefined {
  const imageUrl = pickImageUrl(resource);
  if (!imageUrl) return undefined;
  return {
    id: resource?.id,
    title: resource?.title?.trim() || undefined,
    imageUrl,
  };
}

/** Host suffixes used by Magnific / Freepik stock CDNs. */
const MAGNIFIC_STOCK_IMAGE_HOST_SUFFIXES = ['magnific.com', 'freepik.com', 'b2bpic.net'];

/** True when URL is from a Magnific stock CDN (safe for server-side import). */
export function isMagnificStockImageUrl(imageUrl: string): boolean {
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return MAGNIFIC_STOCK_IMAGE_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export type MagnificDownloadResult = {
  filename: string;
  downloadUrl: string;
};

/** Download a Magnific stock photo by resource ID (licensed download URL). */
export async function downloadMagnificStockPhoto(
  resourceId: number,
  options?: { imageSize?: string },
): Promise<MagnificDownloadResult | undefined> {
  const apiKey = magnificApiKey();
  if (!apiKey) {
    console.warn('[magnific] MAGNIFIC_API_KEY is not set');
    return undefined;
  }

  const imageSize = options?.imageSize ?? '2000px';
  const downloadUrl = `${MAGNIFIC_API_BASE}/resources/${resourceId}/download?image_size=${encodeURIComponent(imageSize)}`;

  const response = await fetch(downloadUrl, {
    headers: {
      'x-magnific-api-key': apiKey,
      Accept: 'application/json',
      'Accept-Language': 'en-US',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn(
      `[magnific] download failed (${response.status}) for resource ${resourceId}: ${body.slice(0, 200)}`,
    );
    return undefined;
  }

  const payload = (await response.json()) as {
    data?: { filename?: string; url?: string; signed_url?: string };
  };
  const url = payload.data?.url?.trim() || payload.data?.signed_url?.trim();
  if (!url) return undefined;

  return {
    filename: payload.data?.filename?.trim() || 'magnific-photo.jpg',
    downloadUrl: url.replace(/^http:\/\//i, 'https://'),
  };
}

/** Search Magnific stock photos by keyword. */
export async function searchMagnificStockPhotos(
  term: string,
  options?: { page?: number; limit?: number },
): Promise<MagnificStockPhoto[]> {
  const apiKey = magnificApiKey();
  if (!apiKey) {
    console.warn('[magnific] MAGNIFIC_API_KEY is not set');
    return [];
  }

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(10, Math.max(1, options?.limit ?? 1));

  const params = new URLSearchParams({
    term: term.trim(),
    page: String(page),
    limit: String(limit),
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
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.warn(
      `[magnific] stock search failed (${response.status}) for "${term}": ${body.slice(0, 200)}`,
    );
    return [];
  }

  const payload = (await response.json()) as MagnificSearchResponse;
  return (payload.data ?? [])
    .map((resource) => mapResource(resource))
    .filter((item): item is MagnificStockPhoto => Boolean(item));
}

export async function searchMagnificStockPhoto(
  term: string,
  page = 1,
): Promise<MagnificStockPhoto | undefined> {
  const results = await searchMagnificStockPhotos(term, { page, limit: 1 });
  return results[0];
}

export async function getCachedMagnificStockPhotoUrl(term: string): Promise<string | undefined> {
  const normalized = term.trim().toLowerCase();
  const cached = memoryCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const photo = await searchMagnificStockPhoto(normalized, 1);
    const url = photo?.imageUrl;
    memoryCache.set(normalized, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
  } catch (err) {
    console.warn('[magnific] stock search error:', err);
    return undefined;
  }
}
