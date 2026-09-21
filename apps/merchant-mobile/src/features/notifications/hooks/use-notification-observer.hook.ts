import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { syncActiveRestaurantId } from "@/features/restaurants/helpers/sync-active-restaurant.helpers";

import { resolveNotificationLinkFromData } from "../helpers/notification-link.helpers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function redirectFromNotification(notification: Notifications.Notification) {
  const raw = notification.request.content.data ?? {};
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const type =
    typeof notification.request.content.data === "object" &&
    notification.request.content.data &&
    "type" in notification.request.content.data
      ? String(
          (notification.request.content.data as Record<string, unknown>).type ??
            "",
        )
      : undefined;

  // Messages inbox is venue-scoped; notifications are cross-venue — align before navigate.
  const restaurantId =
    typeof data.restaurantId === "string" && data.restaurantId.length > 0
      ? data.restaurantId
      : null;
  syncActiveRestaurantId(restaurantId);

  const link = resolveNotificationLinkFromData(data, type);
  if (link) {
    router.push(link.href as never);
  }
}

/**
 * Shows foreground banners and deep-links when the user taps a notification.
 */
export function useNotificationObserver() {
  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      redirectFromNotification(last.notification);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        redirectFromNotification(response.notification);
      });

    return () => {
      subscription.remove();
    };
  }, []);
}
