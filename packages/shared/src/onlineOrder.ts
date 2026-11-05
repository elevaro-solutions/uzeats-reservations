import { buildRestaurantBookingPath } from './bookingUrl.js';

/** `utm_medium` on every diner-page "Order online" link. */
export const ONLINE_ORDER_UTM_MEDIUM = 'reservations';

/** `utm_campaign` on every diner-page "Order online" link. */
export const ONLINE_ORDER_UTM_CAMPAIGN = 'order_online';

type OnlineOrderSettings = {
  onlineOrderUrl?: string | null;
  onlineOrderEnabled?: boolean | null;
};

function parseOnlineOrderUrl(value?: string | null): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url;
  } catch {
    return null;
  }
}

/** True for an http(s) ordering page. A bare host like `doordash.com/store/x` counts. */
export function isValidOnlineOrderUrl(value?: string | null): boolean {
  return parseOnlineOrderUrl(value) !== null;
}

/** Trimmed URL with `https://` added when the scheme is missing; null when empty or invalid. */
export function normalizeOnlineOrderUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !isValidOnlineOrderUrl(trimmed)) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * A stored flag of `null`/`undefined` means enabled: a valid URL turns ordering on
 * until an owner, manager, or admin switches it off.
 */
export function isOnlineOrderingEnabled(restaurant: OnlineOrderSettings): boolean {
  return restaurant.onlineOrderEnabled !== false && isValidOnlineOrderUrl(restaurant.onlineOrderUrl);
}

/** Full public listing path without the scheme, e.g. `tablevera.online/restaurants/teahouse`. */
export function onlineOrderUtmSource(
  siteUrl: string,
  restaurant: { slug?: string | null; id?: string | null },
): string {
  const host = siteUrl.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return `${host}${buildRestaurantBookingPath(restaurant.slug, restaurant.id)}`;
}

/**
 * Partner ordering URL with Tablevera attribution. Existing query params and
 * hash are kept; any `utm_source` / `utm_medium` / `utm_campaign` are replaced.
 */
export function buildOnlineOrderLink(
  orderUrl: string | null | undefined,
  options: { siteUrl: string; slug?: string | null; id?: string | null },
): string | null {
  const url = parseOnlineOrderUrl(orderUrl);
  if (!url) return null;
  url.searchParams.set('utm_source', onlineOrderUtmSource(options.siteUrl, options));
  url.searchParams.set('utm_medium', ONLINE_ORDER_UTM_MEDIUM);
  url.searchParams.set('utm_campaign', ONLINE_ORDER_UTM_CAMPAIGN);
  return url.toString();
}

/** Diner-facing link, or null when ordering is off or the URL is missing/invalid. */
export function resolveOnlineOrderLink(
  restaurant: OnlineOrderSettings & { slug?: string | null; id?: string | null },
  siteUrl: string,
): string | null {
  if (!isOnlineOrderingEnabled(restaurant)) return null;
  return buildOnlineOrderLink(restaurant.onlineOrderUrl, {
    siteUrl,
    slug: restaurant.slug,
    id: restaurant.id,
  });
}
