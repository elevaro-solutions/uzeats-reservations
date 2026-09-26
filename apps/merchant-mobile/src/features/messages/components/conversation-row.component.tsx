import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography, UserAvatar } from "@/components";

export type ConversationRowProps = {
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  preview: string;
  meta?: string | null;
  time?: string | null;
  unreadCount: number;
  onPress: () => void;
};

export function ConversationRow({
  firstName,
  lastName,
  name,
  preview,
  meta,
  time,
  unreadCount,
  onPress,
}: ConversationRowProps) {
  const unread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${unread ? `${unreadCount} unread. ` : ""}${preview}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <UserAvatar
        firstName={firstName ?? undefined}
        lastName={lastName ?? undefined}
        size="md"
      />
      <Flex flex={1} gap={0.25} style={styles.body}>
        <Flex direction="row" alignItems="center" gap={1}>
          <Typography
            weight={unread ? "semibold" : "medium"}
            size="text-md"
            numberOfLines={1}
            style={styles.name}
          >
            {name}
          </Typography>
          {unread ? (
            <View style={styles.badge}>
              <Typography size="text-xs" weight="semibold" color="inverse">
                {unreadCount}
              </Typography>
            </View>
          ) : null}
          {time ? (
            <Typography size="text-xs" color="muted" style={styles.time}>
              {time}
            </Typography>
          ) : null}
        </Flex>
        <Typography
          size="text-sm"
          color={unread ? "secondary" : "muted"}
          numberOfLines={1}
        >
          {preview}
        </Typography>
        {meta ? (
          <Typography size="text-xs" color="muted" numberOfLines={1}>
            {meta}
          </Typography>
        ) : null}
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(1.5),
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
  },
  cardPressed: {
    backgroundColor: colors.slate1,
  },
  body: {
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
  },
  badge: {
    minWidth: space(2.5),
    paddingHorizontal: space(0.75),
    paddingVertical: space(0.25),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  time: {
    marginLeft: "auto",
  },
}));
