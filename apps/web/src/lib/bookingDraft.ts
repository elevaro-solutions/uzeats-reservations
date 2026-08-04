import {
  bookingDraftStorageKey,
  parseBookingDraft,
  serializeBookingDraft,
  type BookingDraft,
} from '@reservations/shared';

export type { BookingDraft };

export function saveBookingDraftToSession(draft: Omit<BookingDraft, 'savedAt'>): void {
  sessionStorage.setItem(bookingDraftStorageKey(draft.restaurantId), serializeBookingDraft(draft));
}

export function loadBookingDraftFromSession(restaurantId: string): BookingDraft | null {
  return parseBookingDraft(sessionStorage.getItem(bookingDraftStorageKey(restaurantId)));
}

export function clearBookingDraftFromSession(restaurantId: string): void {
  sessionStorage.removeItem(bookingDraftStorageKey(restaurantId));
}
