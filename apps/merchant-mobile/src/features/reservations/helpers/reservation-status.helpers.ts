export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export type ReservationActionTone = "primary" | "error" | "secondary" | "warning";

export type ReservationAction = {
  label: string;
  status: ReservationStatus;
  tone?: ReservationActionTone;
  kind: "primary" | "secondary";
};

export type ReservationStatusThemeColors = {
  amber3: string;
  amber4: string;
  amber11: string;
  blue3: string;
  blue4: string;
  blue11: string;
  green3: string;
  green4: string;
  green11: string;
  red3: string;
  red4: string;
  red11: string;
  slate3: string;
  slate4: string;
  slate9: string;
  slate11: string;
};

export type ReservationStatusVisual = {
  label: string;
  chipBg: string;
  chipText: string;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function reservationStatusLabel(status: string): string {
  return STATUS_LABELS[status as ReservationStatus] ?? status;
}

/**
 * Reservation lifecycle palette (not Floor table ops):
 * pending → amber, confirmed → blue, seated → green,
 * completed/cancelled → slate, no_show → red.
 */
export function reservationStatusVisual(
  status: string,
  colors: ReservationStatusThemeColors,
): ReservationStatusVisual {
  switch (status) {
    case "pending":
      return {
        label: STATUS_LABELS.pending,
        chipBg: colors.amber3,
        chipText: colors.amber11,
      };
    case "confirmed":
      return {
        label: STATUS_LABELS.confirmed,
        chipBg: colors.blue3,
        chipText: colors.blue11,
      };
    case "seated":
      return {
        label: STATUS_LABELS.seated,
        chipBg: colors.green3,
        chipText: colors.green11,
      };
    case "no_show":
      return {
        label: STATUS_LABELS.no_show,
        chipBg: colors.red3,
        chipText: colors.red11,
      };
    case "cancelled":
      return {
        label: STATUS_LABELS.cancelled,
        chipBg: colors.slate3,
        chipText: colors.slate9,
      };
    case "completed":
    default:
      return {
        label: STATUS_LABELS[status as ReservationStatus] ?? status,
        chipBg: colors.slate4,
        chipText: colors.slate11,
      };
  }
}

export function nextReservationActions(status: string): ReservationAction[] {
  switch (status) {
    case "pending":
      return [
        { label: "Confirm", status: "confirmed", tone: "primary", kind: "primary" },
        { label: "Cancel", status: "cancelled", tone: "error", kind: "secondary" },
      ];
    case "confirmed":
      return [
        { label: "Seat", status: "seated", tone: "primary", kind: "primary" },
        { label: "No-show", status: "no_show", tone: "secondary", kind: "secondary" },
        { label: "Cancel", status: "cancelled", tone: "error", kind: "secondary" },
      ];
    case "seated":
      return [
        { label: "Complete", status: "completed", tone: "primary", kind: "primary" },
      ];
    default:
      return [];
  }
}

export function primaryReservationAction(
  status: string,
): ReservationAction | null {
  return nextReservationActions(status).find((a) => a.kind === "primary") ?? null;
}

export function secondaryReservationActions(status: string): ReservationAction[] {
  return nextReservationActions(status).filter((a) => a.kind === "secondary");
}

export function guestDisplayName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const name = [diner?.firstName, diner?.lastName].filter(Boolean).join(" ");
  return name || "Guest";
}
