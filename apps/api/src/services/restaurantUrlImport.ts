import {
  isSupportedDeliveryUrl,
  normalizeDeliveryUrl,
  parseRestaurantHtml,
  type ImportedRestaurantData,
} from './mhtmlImport.js';

const FETCH_TIMEOUT_MS = 15_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class RestaurantUrlImportError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_url' | 'blocked' | 'empty' | 'no_data',
  ) {
    super(message);
    this.name = 'RestaurantUrlImportError';
  }
}

function looksLikeBotChallenge(html: string): boolean {
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes('just a moment')
    || sample.includes('cf-browser-verification')
    || sample.includes('challenge-platform')
    || sample.includes('attention required')
  );
}

export async function fetchRestaurantFromUrl(rawUrl: string): Promise<ImportedRestaurantData> {
  const trimmed = rawUrl.trim();
  if (!isSupportedDeliveryUrl(trimmed)) {
    throw new RestaurantUrlImportError(
      'Enter a DoorDash or Uber Eats restaurant page URL (must include /store/).',
      'invalid_url',
    );
  }

  const url = normalizeDeliveryUrl(trimmed);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    html = await res.text();
    if (!res.ok && res.status !== 403) {
      throw new RestaurantUrlImportError(
        `Could not load page (HTTP ${res.status}). Save the page as .mhtml and upload it instead.`,
        'blocked',
      );
    }
  } catch (err) {
    if (err instanceof RestaurantUrlImportError) throw err;
    throw new RestaurantUrlImportError(
      'Could not reach the delivery app page. Save the page as .mhtml and upload it instead.',
      'blocked',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!html.trim()) {
    throw new RestaurantUrlImportError('The page returned no content.', 'empty');
  }

  if (looksLikeBotChallenge(html)) {
    throw new RestaurantUrlImportError(
      'DoorDash and Uber Eats block automated imports. Open the link in your browser, press Ctrl+S (⌘+S), save as Webpage, Single File (.mhtml), then upload it here.',
      'blocked',
    );
  }

  const data = parseRestaurantHtml(html, url);
  if (data.source === 'unknown' && !data.name) {
    throw new RestaurantUrlImportError(
      'Could not extract restaurant data from that URL. Save the page as .mhtml after it fully loads, then upload the file.',
      'no_data',
    );
  }

  return data;
}
