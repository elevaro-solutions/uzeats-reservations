export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export type ReservationAction = {
  label: string;
  status: ReservationStatus;
  tone?: "primary" | "error" | "secondary" | "warning";
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

export function nextReservationActions(status: string): ReservationAction[] {
  switch (status) {
    case "pending":
      return [
        { label: "Confirm", status: "confirmed", tone: "primary" },
        { label: "Cancel", status: "cancelled", tone: "error" },
      ];
    case "confirmed":
      return [
        { label: "Seat", status: "seated", tone: "primary" },
        { label: "No-show", status: "no_show", tone: "warning" },
        { label: "Cancel", status: "cancelled", tone: "error" },
      ];
    case "seated":
      return [{ label: "Complete", status: "completed", tone: "primary" }];
    default:
      return [];
  }
}

export function guestDisplayName(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const name = [diner?.firstName, diner?.lastName].filter(Boolean).join(" ");
  return name || "Guest";
}
