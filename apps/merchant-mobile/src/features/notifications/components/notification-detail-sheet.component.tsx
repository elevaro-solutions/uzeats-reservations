import { StyleSheet } from "react-native-unistyles";

import { BottomSheet, Button, Typography } from "@/components";

import {
  formatNotificationDetailTime,
  formatNotificationTime,
} from "../helpers/format-notification-time.helpers";
import {
  resolveNotificationLink,
  type NotificationLink,
} from "../helpers/notification-link.helpers";
import type { AppNotification } from "../helpers/notification.types";

export type NotificationDetailSheetProps = {
  notification: AppNotification | null;
  visible: boolean;
  onClose: () => void;
  onViewResource: (link: NotificationLink) => void;
};

export function NotificationDetailSheet({
  notification,
  visible,
  onClose,
  onViewResource,
}: NotificationDetailSheetProps) {
  const link = notification ? resolveNotificationLink(notification) : null;
  const relative = notification
    ? formatNotificationTime(notification.createdAt)
    : "";
  const absolute = notification
    ? formatNotificationDetailTime(notification.createdAt)
    : "";
  const description =
    relative && absolute ? `${relative} · ${absolute}` : absolute || relative;

  return (
    <BottomSheet
      visible={visible && Boolean(notification)}
      onClose={onClose}
      title={notification?.title ?? "Notification"}
      description={description || undefined}
      showHandle
      headerBorder
      scrollable
      accessibilityLabel="Close notification"
      contentContainerStyle={styles.body}
      footer={
        link ? (
          <Button
            fullWidth
            size="xl"
            onPress={() => {
              onViewResource(link);
            }}
          >
            {link.label}
          </Button>
        ) : undefined
      }
    >
      {notification ? (
        <Typography size="text-md" color="secondary">
          {notification.body}
        </Typography>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  body: {
    paddingHorizontal: space(3),
    paddingTop: space(3),
    paddingBottom: space(2.5),
    gap: 0,
  },
}));
