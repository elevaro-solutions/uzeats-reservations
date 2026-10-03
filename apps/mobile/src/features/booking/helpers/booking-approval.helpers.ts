import type { BookingApprovalPreview } from "@reservations/shared";

export function bookingApprovalNotice(
  preview: BookingApprovalPreview,
  restaurantName: string,
): { title: string; message: string } | null {
  if (preview === "required") {
    return {
      title: "Needs restaurant approval",
      message: `${restaurantName} reviews this request before confirming. It stays pending until approved, and we'll notify you as soon as they respond.`,
    };
  }
  if (preview === "possible") {
    return {
      title: "May need restaurant approval",
      message: `Some tables at ${restaurantName} need approval. If yours does, the booking stays pending until the restaurant confirms, and we'll notify you when they respond.`,
    };
  }
  return null;
}
