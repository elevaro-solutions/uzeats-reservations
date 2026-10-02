import {
  REMINDER_ACTION_RUNNING_LATE_NO,
  REMINDER_ACTION_RUNNING_LATE_YES,
  RESERVATION_REMINDER_LATE_CATEGORY_ID,
} from "@reservations/shared";
import * as Notifications from "expo-notifications";

export {
  REMINDER_ACTION_RUNNING_LATE_NO,
  REMINDER_ACTION_RUNNING_LATE_YES,
  RESERVATION_REMINDER_LATE_CATEGORY_ID,
};

/**
 * Registers the interactive "Are you running late?" Yes/No category used by
 * closer reservation reminders. Safe to call more than once.
 */
export async function ensureReminderNotificationCategory() {
  await Notifications.setNotificationCategoryAsync(
    RESERVATION_REMINDER_LATE_CATEGORY_ID,
    [
      {
        identifier: REMINDER_ACTION_RUNNING_LATE_YES,
        buttonTitle: "Yes",
        options: { opensAppToForeground: true },
      },
      {
        identifier: REMINDER_ACTION_RUNNING_LATE_NO,
        buttonTitle: "No",
        options: { opensAppToForeground: false },
      },
    ],
  );
}
