import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, Flex, Typography, UserAvatar } from "@/components";

import { splitDisplayName } from "../helpers/message-display.helpers";

export type InquiryRowProps = {
  senderName: string;
  senderEmail?: string | null;
  message: string;
  unread: boolean;
  time?: string | null;
  onPress: () => void;
};

export function InquiryRow({
  senderName,
  senderEmail,
  message,
  unread,
  time,
  onPress,
}: InquiryRowProps) {
  const { firstName, lastName } = splitDisplayName(senderName);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${senderName}. Website inquiry. ${unread ? "Unread. " : ""}${message}`}
      style={({ pressed }) => [
        styles.card,
        unread && styles.unread,
        pressed && styles.cardPressed,
      ]}
    >
      <UserAvatar
        firstName={firstName}
        lastName={lastName}
        size="md"
        variant="subtle"
      />
      <Flex flex={1} gap={0.5} style={styles.body}>
        <Flex direction="row" alignItems="center" gap={0.75}>
          <Typography
            weight={unread ? "semibold" : "medium"}
            size="text-md"
            numberOfLines={1}
            style={styles.name}
          >
            {senderName}
          </Typography>
          <View pointerEvents="none">
            <Chip size="xs">Website</Chip>
          </View>
          {unread ? <View style={styles.unreadDot} /> : null}
          {time ? (
            <Typography size="text-xs" color="muted" style={styles.time}>
              {time}
            </Typography>
          ) : null}
        </Flex>
        <Typography size="text-sm" color="secondary" numberOfLines={2}>
          {message}
        </Typography>
        {senderEmail ? (
          <Typography size="text-xs" color="muted" numberOfLines={1}>
            {senderEmail}
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
    borderColor: colors.slate3,
  },
  unread: {
    backgroundColor: colors.primary2,
    borderColor: colors.primary2,
  },
  cardPressed: {
    opacity: 0.88,
  },
  body: {
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
  },
  time: {
    marginLeft: "auto",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
}));
