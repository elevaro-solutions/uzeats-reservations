export type GuestNameSource = {
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined;

/** First + last name, or "Guest" when both are blank. */
export function guestDisplayName(diner?: GuestNameSource): string {
  const name = [diner?.firstName, diner?.lastName].filter(Boolean).join(" ");
  return name || "Guest";
}
