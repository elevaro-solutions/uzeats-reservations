import {
  bookingDraftStorageKey,
  parseBookingDraft,
  serializeBookingDraft,
  type BookingDraft,
} from "@reservations/shared";

import { mmkv } from "@/store";

export type { BookingDraft };

export function loadBookingDraft(restaurantId: string): BookingDraft | null {
  const raw = mmkv.getString(bookingDraftStorageKey(restaurantId));
  return parseBookingDraft(raw ?? null);
}

export function saveBookingDraft(
  draft: Omit<BookingDraft, "savedAt">,
): void {
  mmkv.set(
    bookingDraftStorageKey(draft.restaurantId),
    serializeBookingDraft(draft),
  );
}

export function clearBookingDraft(restaurantId: string): void {
  mmkv.remove(bookingDraftStorageKey(restaurantId));
}
