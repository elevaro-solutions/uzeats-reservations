import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import { formatNotificationTime } from "../helpers/format-notification-time.helpers";
import {
  getNotificationIcon,
  getNotificationIconTone,
} from "../helpers/notification-icon.helpers";
import type { AppNotification } from "../helpers/notification.types";

export type NotificationListCardProps = {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
};

export function NotificationListCard({
  notification,
  onPress,
}: NotificationListCardProps) {
  const { theme } = useUnistyles();
  const unread = !notification.readAt;
  const tone = getNotificationIconTone(notification.type);
  styles.useVariants({ tone });

  const iconColor = {
    primary: theme.colors.primary,
    info: theme.colors.info,
    success: theme.colors.success,
    accent: theme.colors.accent,
    warning: theme.colors.warningPress,
    error: theme.colors.error,
    muted: theme.colors.textSecondary,
  }[tone];

  return (
    <Pressable
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${unread ? "Unread. " : ""}${notification.body}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.iconWrap}>
        {getNotificationIcon(notification.type, {
          size: 20,
          color: iconColor,
        })}
      </View>

      <Flex flex={1} gap={0.5} style={styles.body}>
        <Flex direction="row" alignItems="center" gap={0.75}>
          <Flex
            direction="row"
            alignItems="center"
            gap={0.75}
            flex={1}
            style={styles.titleRow}
          >
            <Typography
              weight={unread ? "semibold" : "medium"}
              size="text-md"
              numberOfLines={1}
              style={styles.title}
            >
              {notification.title}
            </Typography>
            {unread ? <View style={styles.unreadDot} /> : null}
          </Flex>
          <Typography size="text-xs" color="muted" style={styles.time}>
            {formatNotificationTime(notification.createdAt)}
          </Typography>
        </Flex>
        <Typography
          size="text-sm"
          color={unread ? "secondary" : "muted"}
          numberOfLines={2}
        >
          {notification.body}
        </Typography>
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1.5),
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    backgroundColor: colors.background,
  },
  rowPressed: {
    backgroundColor: colors.slate2,
  },
  iconWrap: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    variants: {
      tone: {
        primary: { backgroundColor: colors.primary2 },
        info: { backgroundColor: colors.infoSubtle },
        success: { backgroundColor: colors.successSubtle },
        accent: { backgroundColor: colors.accent2 },
        warning: { backgroundColor: colors.warningSubtle },
        error: { backgroundColor: colors.errorSubtle },
        muted: { backgroundColor: colors.slate3 },
      },
    },
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary5,
    flexShrink: 0,
  },
  body: {
    minWidth: 0,
  },
  titleRow: {
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
  time: {
    flexShrink: 0,
  },
}));
