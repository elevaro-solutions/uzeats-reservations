import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { resolveNotificationLinkFromData } from "../helpers/notification-link.helpers";
import {
  ensureReminderNotificationCategory,
  REMINDER_ACTION_RUNNING_LATE_NO,
  REMINDER_ACTION_RUNNING_LATE_YES,
} from "../helpers/reminder-actions.helpers";
import {
  isAskRunningLate,
  reservationIdFromData,
} from "../helpers/reminder-late.helpers";
import { reportRunningLateAndOpenThread } from "../helpers/report-running-late.helpers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const handledResponseIds = new Set<string>();

function notificationData(
  notification: Notifications.Notification,
): Record<string, unknown> {
  const raw = notification.request.content.data ?? {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function responseKey(response: Notifications.NotificationResponse): string {
  const id = response.notification.request.identifier;
  if (id) return id;
  const data = notificationData(response.notification);
  const reservationId = reservationIdFromData(data) ?? "";
  return `${response.actionIdentifier}:${reservationId}:${String(response.notification.date)}`;
}

function redirectFromNotification(notification: Notifications.Notification) {
  const data = notificationData(notification);
  const reservationId = reservationIdFromData(data);
  if (isAskRunningLate(data) && reservationId) {
    router.push(`/reservations/${reservationId}/running-late` as never);
    return;
  }
  const link = resolveNotificationLinkFromData(data);
  if (link) {
    router.push(link.href as never);
  }
}

/**
 * Shows foreground banners and deep-links when the user taps a notification.
 * Handles Yes/No actions on closer reservation reminders, including cold start.
 */
export function useNotificationObserver() {
  useEffect(() => {
    void ensureReminderNotificationCategory();

    const last = Notifications.getLastNotificationResponse();
    if (last) {
      void handleNotificationResponse(last);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void handleNotificationResponse(response);
      });

    return () => {
      subscription.remove();
    };
  }, []);
}

async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const key = responseKey(response);
  if (handledResponseIds.has(key)) return;
  handledResponseIds.add(key);

  const action = response.actionIdentifier;
  const data = notificationData(response.notification);
  const reservationId = reservationIdFromData(data);

  if (action === REMINDER_ACTION_RUNNING_LATE_YES && reservationId) {
    await reportRunningLateAndOpenThread(reservationId);
    return;
  }

  if (action === REMINDER_ACTION_RUNNING_LATE_NO) {
    // Guest is on time — no server call; avoid opening the app deep-link spam.
    return;
  }

  redirectFromNotification(response.notification);
}
