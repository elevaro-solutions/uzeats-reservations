import { formatTrafficSource } from '@reservations/shared';
import { formatAttributionUrl } from '@/lib/reservationFormat';

export type ReservationAttributionFields = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
  originUrl?: string | null;
  referrer?: string | null;
};

export type AttributionMetaChip = {
  label: string;
  value: string;
  /** Full value for hover when `value` is shortened. */
  title?: string;
};

/** Compact path display — drop long query strings from Landing / Booked from chips. */
export function shortenAttributionPath(pathOrUrl?: string | null): AttributionMetaChip | null {
  const raw = pathOrUrl?.trim();
  if (!raw) return null;

  let pathWithQuery = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      pathWithQuery = `${parsed.pathname}${parsed.search}` || raw;
    }
  } catch {
    // keep raw
  }

  const q = pathWithQuery.indexOf('?');
  if (q >= 0) {
    return {
      label: '',
      value: `${pathWithQuery.slice(0, q)}?…`,
      title: pathWithQuery,
    };
  }
  return { label: '', value: pathWithQuery, title: pathWithQuery.length > 48 ? pathWithQuery : undefined };
}

/** Hover text for the list Source pill (booked-from URL, else referrer). */
export function sourceOriginTooltip(
  reservation: Pick<ReservationAttributionFields, 'originUrl' | 'referrer'> | null | undefined,
): string | null {
  if (!reservation) return null;
  const origin = reservation.originUrl?.trim();
  if (origin) return origin;
  const referrer = reservation.referrer?.trim();
  return referrer || null;
}

/** Labels for reservation detail MetaChips (UTMs / Landing / origin URL). */
export function attributionMetaChips(
  reservation: ReservationAttributionFields | null | undefined,
): AttributionMetaChip[] {
  if (!reservation) return [];

  const chips: AttributionMetaChip[] = [];

  // Marketing traffic label when it adds info beyond billing Source (widget is omitted —
  // Source already says Widget; raw UTMs are listed below).
  const traffic = formatTrafficSource(reservation);
  if (traffic) chips.push({ label: 'Traffic', value: traffic });

  const utmSource = reservation.utmSource?.trim();
  if (utmSource) chips.push({ label: 'UTM source', value: utmSource });

  const utmMedium = reservation.utmMedium?.trim();
  if (utmMedium) chips.push({ label: 'Medium', value: utmMedium });

  const campaign = reservation.utmCampaign?.trim();
  if (campaign) chips.push({ label: 'Campaign', value: campaign });

  const content = reservation.utmContent?.trim();
  if (content) chips.push({ label: 'Content', value: content });

  const term = reservation.utmTerm?.trim();
  if (term) chips.push({ label: 'Term', value: term });

  const landing = shortenAttributionPath(reservation.landingPath);
  if (landing) chips.push({ label: 'Landing', value: landing.value, title: landing.title });

  const originRaw =
    formatAttributionUrl(reservation.originUrl) || reservation.originUrl?.trim() || null;
  const origin = shortenAttributionPath(originRaw);
  if (origin) chips.push({ label: 'Booked from', value: origin.value, title: origin.title });

  const referrer = reservation.referrer?.trim();
  if (referrer) {
    chips.push({
      label: 'Referrer',
      value: referrer,
      title: referrer.length > 48 ? referrer : undefined,
    });
  }

  return chips;
}
