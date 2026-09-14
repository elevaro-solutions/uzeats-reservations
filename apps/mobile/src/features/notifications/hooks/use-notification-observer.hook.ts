import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function redirectFromNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data ?? {};

  const url = asString(data.url);
  if (url) {
    router.push(url as never);
    return;
  }

  const reservationId = asString(data.reservationId);
  if (reservationId) {
    router.push(`/reservations/${reservationId}`);
    return;
  }

  const restaurantId = asString(data.restaurantId);
  if (restaurantId) {
    router.push(`/restaurant/${restaurantId}`);
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
