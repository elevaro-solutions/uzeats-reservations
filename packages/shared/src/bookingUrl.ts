const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isMongoObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/** Public booking path — prefers short `/r/:slug` URLs for sharing. */
export function buildRestaurantBookingPath(slug?: string | null, id?: string | null): string {
  if (slug) return `/r/${slug}`;
  if (id) return `/restaurants/${id}`;
  return '/';
}

export function buildWidgetEmbedCode(options: {
  restaurantId: string;
  widgetUrl?: string;
  appUrl?: string;
  mode?: 'inline' | 'button';
  primaryColor?: string;
  buttonText?: string;
  showReviews?: boolean;
}): string {
  const widgetUrl = options.widgetUrl ?? 'https://tablevera.online/widget.js';
  const attrs = [`src="${widgetUrl}"`, `  data-restaurant-id="${options.restaurantId}"`];
  if (options.mode === 'button') attrs.push('  data-mode="button"');
  if (options.appUrl) attrs.push(`  data-app-url="${options.appUrl.replace(/\/$/, '')}"`);
  if (options.primaryColor) attrs.push(`  data-primary-color="${options.primaryColor}"`);
  if (options.buttonText) attrs.push(`  data-button-text="${options.buttonText.replace(/"/g, '&quot;')}"`);
  if (options.showReviews === false) attrs.push('  data-show-reviews="false"');
  return `<script\n${attrs.join('\n')}\n></script>`;
}

export function buildRestaurantBookingUrl(
  baseUrl: string,
  options: { slug?: string | null; id?: string | null; params?: Record<string, string | number | undefined> },
): string {
  const origin = baseUrl.replace(/\/$/, '');
  const path = buildRestaurantBookingPath(options.slug, options.id);
  if (!options.params) return `${origin}${path}`;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(options.params)) {
    if (value != null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  const qs = parts.join('&');
  return `${origin}${path}${qs ? `?${qs}` : ''}`;
}
