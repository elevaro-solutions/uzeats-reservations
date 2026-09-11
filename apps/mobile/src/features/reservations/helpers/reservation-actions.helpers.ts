import {
  canCancelReservation,
  canEditReservation,
  canLeaveReview,
  isReservationPast,
  isReservationUpcoming,
  needsDepositPayment,
  type ReservationTimingFields,
} from "./reservation-display.helpers";

export type PrimaryCtaKind =
  | "pay_deposit"
  | "leave_review"
  | "book_again"
  | null;

export type OverflowActionId =
  | "edit"
  | "cancel"
  | "message"
  | "add_to_calendar"
  | "book_again"
  | "save_restaurant"
  | "leave_review"
  | "billing";

export type OverflowAction = {
  id: OverflowActionId;
  label: string;
  tone?: "default" | "danger";
};

export type ReservationActionFields = ReservationTimingFields & {
  hasReview?: boolean | null;
  depositAmountCents?: number | null;
  restaurant?: {
    id?: string | null;
    isSaved?: boolean | null;
  } | null;
};

/** Web canManage: upcoming + pending/confirmed (not seated). */
export function canManageReservation(r: ReservationTimingFields): boolean {
  return (
    isReservationUpcoming(r) &&
    (r.status === "pending" || r.status === "confirmed")
  );
}

export function resolvePrimaryCta(r: ReservationActionFields): PrimaryCtaKind {
  if (needsDepositPayment(r)) return "pay_deposit";
  if (canLeaveReview(r)) return "leave_review";
  if (isReservationPast(r)) return "book_again";
  return null;
}

export function resolveOverflowActions(
  r: ReservationActionFields,
  primary: PrimaryCtaKind,
): OverflowAction[] {
  const actions: OverflowAction[] = [];
  const past = isReservationPast(r);
  const upcoming = isReservationUpcoming(r);
  const restaurantId = r.restaurant?.id;

  if (canEditReservation(r)) {
    actions.push({ id: "edit", label: "Edit reservation" });
  }
  if (canManageReservation(r)) {
    actions.push({ id: "message", label: "Message restaurant" });
  }
  if (upcoming) {
    actions.push({ id: "add_to_calendar", label: "Add to calendar" });
  }
  if (past && primary !== "book_again") {
    actions.push({ id: "book_again", label: "Book again" });
  }
  if (past && restaurantId && !r.restaurant?.isSaved) {
    actions.push({ id: "save_restaurant", label: "Save restaurant" });
  }
  if (canLeaveReview(r) && primary !== "leave_review") {
    actions.push({ id: "leave_review", label: "Leave review" });
  }
  if ((r.depositAmountCents ?? 0) > 0) {
    actions.push({ id: "billing", label: "Billing" });
  }
  if (canCancelReservation(r)) {
    actions.push({ id: "cancel", label: "Cancel reservation", tone: "danger" });
  }

  return actions;
}

export function primaryCtaLabel(kind: PrimaryCtaKind): string {
  switch (kind) {
    case "pay_deposit":
      return "Pay deposit";
    case "leave_review":
      return "Leave review";
    case "book_again":
      return "Book again";
    default:
      return "";
  }
}

export function visitIneligibleCaption(r: ReservationTimingFields): string | null {
  if (r.status === "cancelled") {
    return "This reservation was cancelled.";
  }
  if (isReservationPast(r)) {
    return "This visit is in the past. Editing is closed.";
  }
  if (r.status === "seated" && !canCancelReservation(r)) {
    return "You're seated — ask the restaurant for changes.";
  }
  if (!canEditReservation(r) && isReservationUpcoming(r)) {
    return "Editing is closed for this booking.";
  }
  return null;
}
