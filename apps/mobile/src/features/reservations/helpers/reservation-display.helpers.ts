const TERMINAL_STATUSES = new Set(["cancelled", "completed", "no_show"]);
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "seated"]);
/** Guests may edit pending/confirmed only — seated visits need the restaurant. */
const EDITABLE_STATUSES = new Set(["pending", "confirmed"]);
const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);

export type ReservationListSegment = "all" | "upcoming" | "past" | "cancelled";

export type ReservationTimingFields = {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
};

export function isReservationPast(r: ReservationTimingFields): boolean {
  if (TERMINAL_STATUSES.has(r.status)) return true;
  const end = r.slotEnd ? new Date(r.slotEnd) : new Date(r.slotStart);
  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

export function displayReservationStatus(r: ReservationTimingFields): string {
  if (TERMINAL_STATUSES.has(r.status)) return r.status;
  if (ACTIVE_STATUSES.has(r.status) && isReservationPast(r)) return "past";
  if (needsDepositPayment(r)) return "deposit_due";
  return r.status;
}

export function isReservationUpcoming(r: ReservationTimingFields): boolean {
  return ACTIVE_STATUSES.has(r.status) && !isReservationPast(r);
}

export function isReservationCancelled(r: { status: string }): boolean {
  return r.status === "cancelled";
}

export function needsDepositPayment(r: ReservationTimingFields): boolean {
  return (
    isReservationUpcoming(r) &&
    r.depositStatus === "requires_payment" &&
    (r.depositAmountCents ?? 0) > 0
  );
}

export function canEditReservation(r: ReservationTimingFields): boolean {
  return isReservationUpcoming(r) && EDITABLE_STATUSES.has(r.status);
}

export function canCancelReservation(r: ReservationTimingFields): boolean {
  return isReservationUpcoming(r) && CANCELLABLE_STATUSES.has(r.status);
}

export function canLeaveReview(r: {
  status: string;
  hasReview?: boolean | null;
}): boolean {
  return r.status === "completed" && !r.hasReview;
}

export function filterReservationsBySegment<T extends ReservationTimingFields>(
  reservations: T[],
  segment: ReservationListSegment,
): T[] {
  switch (segment) {
    case "upcoming":
      return reservations.filter(isReservationUpcoming);
    case "past":
      return reservations.filter(
        (r) => isReservationPast(r) && !isReservationCancelled(r),
      );
    case "cancelled":
      return reservations.filter(isReservationCancelled);
    case "all":
    default:
      return reservations;
  }
}

export function defaultReservationSegment(
  reservations: ReservationTimingFields[],
): ReservationListSegment {
  if (reservations.some(isReservationUpcoming)) return "upcoming";
  return "all";
}

export function formatReservationWhen(slotStart: string): string {
  const date = new Date(slotStart);
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatReservationDate(slotStart: string): string {
  return new Date(slotStart).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatReservationTime(
  slotStart: string,
  slotEnd?: string | null,
): string {
  const start = new Date(slotStart).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!slotEnd) return start;
  const end = new Date(slotEnd).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

export function statusLabel(status: string): string {
  if (status === "no_show") return "No show";
  if (status === "deposit_due") return "Deposit due";
  return status.replace(/_/g, " ");
}

export function formatDepositStatusLabel(status: string): string {
  switch (status) {
    case "requires_payment":
      return "Payment due";
    case "authorized":
      return "Authorized";
    case "captured":
      return "Captured";
    case "refunded":
      return "Refunded";
    case "failed":
      return "Failed";
    case "none":
      return "None";
    default:
      return status.replace(/_/g, " ");
  }
}

export type DepositStatusTone = "success" | "warning" | "error" | "muted";

export function depositStatusTone(status: string): DepositStatusTone {
  switch (status) {
    case "requires_payment":
      return "warning";
    case "authorized":
    case "captured":
      return "success";
    case "failed":
      return "error";
    case "refunded":
    case "none":
    default:
      return "muted";
  }
}

export function formatCentsAsDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Known placeholder Unsplash table photo used in seed data — skip as thumbnail. */
export function isPlaceholderTablePhoto(photoUrl?: string | null): boolean {
  if (!photoUrl) return true;
  return photoUrl.includes("1551782450-a2132b4ba21d");
}

export function formatVisitAddress(address?: {
  line1?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null): string | null {
  if (!address) return null;
  const line1 = address.line1?.trim() || "";
  const neighborhood = address.neighborhood?.trim() || "";
  const city = address.city?.trim() || "";
  const state = address.state?.trim() || "";
  if (line1 && neighborhood) return `${line1}, ${neighborhood}`;
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  if (line1 && city) return `${line1}, ${city}`;
  if (neighborhood) return neighborhood;
  if (line1) return line1;
  const locality = [city, state].filter(Boolean).join(", ");
  return locality || null;
}

/** Short guest-facing reference from Mongo/ObjectId-style ids. */
export function formatReservationReference(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, "");
  const slice = cleaned.slice(-8).toUpperCase();
  return slice || id.toUpperCase();
}

export function emptyCopyForSegment(segment: ReservationListSegment): {
  title: string;
  description: string;
} {
  switch (segment) {
    case "upcoming":
      return {
        title: "No upcoming reservations",
        description: "Book a table and your next visit will show up here.",
      };
    case "past":
      return {
        title: "No past reservations",
        description: "Completed visits will appear in this list.",
      };
    case "cancelled":
      return {
        title: "No cancelled reservations",
        description: "Cancelled bookings will be listed here.",
      };
    case "all":
    default:
      return {
        title: "No reservations yet",
        description: "When you book a table, it will show up here.",
      };
  }
}
