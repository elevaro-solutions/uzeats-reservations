import { REMINDER_LATE_CHECK_MAX_MINUTES } from "@reservations/shared";

import {
  parseNotificationData,
  resolveNotificationLink,
} from "./notification-link.helpers";
import type { AppNotification } from "./notification.types";

/** Push payloads often stringify booleans. */
export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function isAskRunningLate(data: Record<string, unknown>): boolean {
  return isTruthyFlag(data.askRunningLate);
}

export function reservationIdFromData(
  data: Record<string, unknown>,
): string | null {
  const id = data.reservationId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Seating is still in the future and within the closer-reminder window (2h). */
export function isWithinLateCheckWindow(slotStart: string | Date): boolean {
  const start =
    typeof slotStart === "string" ? new Date(slotStart) : slotStart;
  const at = start.getTime();
  if (!Number.isFinite(at)) return false;
  const remainingMs = at - Date.now();
  if (remainingMs <= 0) return false;
  return remainingMs <= REMINDER_LATE_CHECK_MAX_MINUTES * 60 * 1000;
}

export function notificationAsksRunningLate(
  notification: Pick<AppNotification, "type" | "data">,
): boolean {
  if (notification.type !== "reservation_reminder") return false;
  return isAskRunningLate(parseNotificationData(notification.data));
}

const dismissedLatePrompt = new Set<string>();

export function hasDismissedRunningLatePrompt(reservationId: string): boolean {
  return dismissedLatePrompt.has(reservationId);
}

export function dismissRunningLatePrompt(reservationId: string): void {
  dismissedLatePrompt.add(reservationId);
}

export function runningLateReservationId(
  notification: Pick<AppNotification, "data">,
): string | null {
  const fromData = reservationIdFromData(
    parseNotificationData(notification.data),
  );
  if (fromData) return fromData;
  const link = resolveNotificationLink(notification);
  const match = link?.href.match(/^\/reservations\/([^/?#]+)/);
  return match?.[1] ?? null;
}
