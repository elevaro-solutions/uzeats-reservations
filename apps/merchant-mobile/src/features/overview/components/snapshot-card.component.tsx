import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type SnapshotCardProps = {
  label: string;
  value: number;
  icon: ReactNode;
  onPress?: () => void;
};

export function SnapshotCard({
  label,
  value,
  icon,
  onPress,
}: SnapshotCardProps) {
  const content = (
    <Flex gap={1} style={styles.card}>
      {icon}
      <Typography weight="bold" size="display-xs">
        {value}
      </Typography>
      <Typography size="text-sm" color="secondary">
        {label}
      </Typography>
    </Flex>
  );

  if (!onPress) return <View style={styles.cardWrap}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  cardWrap: {
    width: "47%",
    flexGrow: 1,
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: space(14),
  },
  cardPressed: {
    opacity: 0.85,
  },
}));
