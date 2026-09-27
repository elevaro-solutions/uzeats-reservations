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

/** Labels for reservation detail MetaChips (Traffic / Landing / origin URL). */
export function attributionMetaChips(
  reservation: ReservationAttributionFields | null | undefined,
): Array<{ label: string; value: string }> {
  if (!reservation) return [];

  const chips: Array<{ label: string; value: string }> = [];
  const traffic = formatTrafficSource(reservation);
  if (traffic) chips.push({ label: 'Traffic', value: traffic });

  const campaign = reservation.utmCampaign?.trim();
  if (campaign) chips.push({ label: 'Campaign', value: campaign });

  const landing = reservation.landingPath?.trim();
  if (landing) chips.push({ label: 'Landing', value: landing });

  const origin =
    formatAttributionUrl(reservation.originUrl) || reservation.originUrl?.trim() || null;
  if (origin) chips.push({ label: 'Booked from', value: origin });

  const referrer = reservation.referrer?.trim();
  if (referrer) chips.push({ label: 'Referrer', value: referrer });

  return chips;
}
