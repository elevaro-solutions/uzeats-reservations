/**
 * Booking attribution — UTMs + landing/origin URLs captured at create time.
 * Billing still uses ReservationSource (network/website/widget/phone/walkin).
 */

export type ReservationAttributionInput = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** Path + query when the diner first landed with UTMs (or first page of session). */
  landingPath?: string;
  /** Full page URL when the reservation was submitted. */
  originUrl?: string;
  /** document.referrer at first capture (external site). */
  referrer?: string;
};

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export type UtmParamKey = (typeof UTM_KEYS)[number];

/** Map utm_* query keys → attribution field names. */
export const UTM_TO_ATTRIBUTION: Record<UtmParamKey, keyof ReservationAttributionInput> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
};

export function hasUtmParams(params: URLSearchParams | Record<string, string | null | undefined>): boolean {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) : params[key];
  return UTM_KEYS.some((key) => Boolean(get(key)?.trim()));
}

export function attributionFromSearchParams(
  params: URLSearchParams,
): Pick<
  ReservationAttributionInput,
  'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm'
> {
  const out: ReservationAttributionInput = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) out[UTM_TO_ATTRIBUTION[key]] = value;
  }
  return out;
}

/**
 * Resolve billing `source` for diner bookings from explicit input + UTMs.
 * Widget embeds bill as `widget`; everything else on the diner web app is `network`.
 */
export function resolveDinerReservationSource(input: {
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): 'network' | 'website' | 'widget' {
  const explicit = input.source?.trim().toLowerCase();
  if (explicit === 'network' || explicit === 'website' || explicit === 'widget') {
    return explicit;
  }
  const utmSource = input.utmSource?.trim().toLowerCase() ?? '';
  const utmMedium = input.utmMedium?.trim().toLowerCase() ?? '';
  if (utmSource === 'widget' || utmMedium === 'embed') return 'widget';
  return 'network';
}

/** Human label for traffic (UTMs / referrer), separate from billing source. */
export function formatTrafficSource(attrs: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
} | null | undefined): string | null {
  if (!attrs) return null;
  const source = attrs.utmSource?.trim().toLowerCase() ?? '';
  const medium = attrs.utmMedium?.trim().toLowerCase() ?? '';

  if (source === 'google' && medium === 'business_profile') {
    return 'Google Business Profile';
  }
  // Widget/embed is already shown as billing Source ("Widget") — omit redundant traffic label.
  if (source === 'widget' || medium === 'embed') {
    return null;
  }
  if (source === 'google') return 'Google';
  if (source) {
    return source.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (attrs.referrer?.trim()) return 'Referral';
  return null;
}
