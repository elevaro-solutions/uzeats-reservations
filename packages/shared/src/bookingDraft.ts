export const BOOKING_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

export type BookingDraft = {
  restaurantId: string;
  date: string;
  partySize: number;
  selectedSlot: string | null;
  selectedTableId: string | null;
  occasion: string;
  notes: string;
  promoCode: string;
  giftCardCode: string;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  savedAt: number;
};

export function bookingDraftStorageKey(restaurantId: string): string {
  return `tablevera:booking-draft:${restaurantId}`;
}

export function parseBookingDraft(raw: string | null): BookingDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BookingDraft;
    if (!parsed?.restaurantId || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > BOOKING_DRAFT_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeBookingDraft(draft: Omit<BookingDraft, 'savedAt'>): string {
  const payload: BookingDraft = { ...draft, savedAt: Date.now() };
  return JSON.stringify(payload);
}

export function buildBookingResumePath(
  bookingPath: string,
  draft: Pick<BookingDraft, 'date' | 'partySize' | 'selectedSlot' | 'promoCode'>,
): string {
  const parts = [
    `date=${encodeURIComponent(draft.date)}`,
    `party=${encodeURIComponent(String(draft.partySize))}`,
  ];
  if (draft.selectedSlot) parts.push(`slot=${encodeURIComponent(draft.selectedSlot)}`);
  const promo = draft.promoCode.trim().toUpperCase();
  if (promo) parts.push(`promo=${encodeURIComponent(promo)}`);
  parts.push('resume=1');
  return `${bookingPath}?${parts.join('&')}`;
}

/** Allow only same-origin relative paths for post-auth redirects. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (/[\x00-\x1f\\]/.test(path)) return false;
  return true;
}
