import type { AppNotification } from "./notification.types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parseNotificationData(
  data: string | null | undefined,
): Record<string, unknown> {
  if (!data) return {};
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type NotificationLink = {
  href: string;
  label: string;
};

/**
 * Shared deep-link order for push taps and inbox CTAs:
 * url → reservationId → restaurantId.
 */
export function resolveNotificationLinkFromData(
  data: Record<string, unknown>,
): NotificationLink | null {
  const url = asString(data.url);
  if (url) {
    return { href: url, label: "View details" };
  }

  const reservationId = asString(data.reservationId);
  if (reservationId) {
    return {
      href: `/reservations/${reservationId}`,
      label: "View reservation",
    };
  }

  const restaurantId = asString(data.restaurantId);
  if (restaurantId) {
    return {
      href: `/restaurant/${restaurantId}`,
      label: "View restaurant",
    };
  }

  return null;
}

export function resolveNotificationLink(
  notification: Pick<AppNotification, "data">,
): NotificationLink | null {
  return resolveNotificationLinkFromData(
    parseNotificationData(notification.data),
  );
}
