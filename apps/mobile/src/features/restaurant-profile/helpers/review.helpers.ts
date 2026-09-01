import { formatReviewDate } from "./restaurant-profile.helpers";

const RELATIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function canLeaveReview(reservation: {
  status: string;
  hasReview?: boolean | null;
}): boolean {
  return reservation.status === "completed" && !reservation.hasReview;
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
