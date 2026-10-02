import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { apolloClient } from "@/graphql";

import { REPORT_RUNNING_LATE } from "../api/notifications.operations";
import { resolveNotificationLinkFromData } from "../helpers/notification-link.helpers";
import {
  ensureReminderNotificationCategory,
  REMINDER_ACTION_RUNNING_LATE_NO,
  REMINDER_ACTION_RUNNING_LATE_YES,
} from "../helpers/reminder-actions.helpers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function notificationData(
  notification: Notifications.Notification,
): Record<string, unknown> {
  const raw = notification.request.content.data ?? {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function redirectFromNotification(notification: Notifications.Notification) {
  const link = resolveNotificationLinkFromData(notificationData(notification));
  if (link) {
    router.push(link.href as never);
  }
}

async function handleRunningLateYes(reservationId: string) {
  try {
    await apolloClient.mutate({
      mutation: REPORT_RUNNING_LATE,
      variables: { reservationId },
    });
  } catch (err) {
    console.warn("[push] reportRunningLate failed", err);
  }
  router.push(`/reservations/${reservationId}/messages` as never);
}

/**
 * Shows foreground banners and deep-links when the user taps a notification.
 * Handles Yes/No actions on closer reservation reminders.
 */
export function useNotificationObserver() {
  useEffect(() => {
    void ensureReminderNotificationCategory();

    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      // Cold start: only deep-link from a body tap. Do not re-fire Yes/No —
      // those already ran when the user pressed the action button.
      if (
        last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        redirectFromNotification(last.notification);
      }
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
  const action = response.actionIdentifier;
  const data = notificationData(response.notification);
  const reservationId =
    typeof data.reservationId === "string" ? data.reservationId : null;

  if (action === REMINDER_ACTION_RUNNING_LATE_YES && reservationId) {
    await handleRunningLateYes(reservationId);
    return;
  }

  if (action === REMINDER_ACTION_RUNNING_LATE_NO) {
    // Guest is on time — no server call; avoid opening the app deep-link spam.
    return;
  }

  redirectFromNotification(response.notification);
}
