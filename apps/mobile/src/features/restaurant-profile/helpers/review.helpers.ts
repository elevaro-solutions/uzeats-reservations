import { formatReviewDate } from "./restaurant-profile.helpers";

const RELATIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/** Past visits can be reviewed even if managers never flipped status to completed. */
export function canLeaveReview(reservation: {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  hasReview?: boolean | null;
}): boolean {
  if (reservation.hasReview) return false;
  if (
    reservation.status === "cancelled" ||
    reservation.status === "no_show" ||
    reservation.status === "pending"
  ) {
    return false;
  }
  if (reservation.status === "completed") return true;
  if (reservation.status === "confirmed" || reservation.status === "seated") {
    const end = reservation.slotEnd
      ? new Date(reservation.slotEnd)
      : new Date(reservation.slotStart);
    return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
  }
  return false;
}

function formatRelativeTime(diffMs: number): string {
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatRelativeReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < RELATIVE_THRESHOLD_MS) {
    return formatRelativeTime(diffMs);
  }

  return formatReviewDate(iso);
}
