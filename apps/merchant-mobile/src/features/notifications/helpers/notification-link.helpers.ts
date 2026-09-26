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
 * Merchant deep links for push taps and inbox CTAs.
 */
export function resolveNotificationLinkFromData(
  data: Record<string, unknown>,
  type?: string | null,
): NotificationLink | null {
  const url = asString(data.url);
  if (url) {
    return { href: url, label: "View details" };
  }

  const reservationId = asString(data.reservationId);
  if (reservationId) {
    const typeLower = (type ?? asString(data.type) ?? "").toLowerCase();
    if (
      typeLower.includes("message") ||
      typeLower === "new_message" ||
      asString(data.kind)?.toLowerCase() === "message"
    ) {
      return {
        href: `/messages/${reservationId}`,
        label: "Open conversation",
      };
    }
    return {
      href: `/reservations/${reservationId}`,
      label: "View reservation",
    };
  }

  const typeLower = (type ?? asString(data.type) ?? "").toLowerCase();
  if (typeLower.includes("waitlist")) {
    return { href: "/waitlist", label: "Open waitlist" };
  }

  if (typeLower.includes("message") || typeLower === "new_message") {
    return { href: "/messages", label: "Open messages" };
  }

  return { href: "/notifications", label: "View notifications" };
}

export function resolveNotificationLink(
  notification: Pick<AppNotification, "data" | "type">,
): NotificationLink | null {
  return resolveNotificationLinkFromData(
    parseNotificationData(notification.data),
    notification.type,
  );
}
