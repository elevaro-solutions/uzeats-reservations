import { type ReactElement } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import { IconPropsType } from "@/types";

export type ProfileMenuRowProps = {
  title: string;
  /** Trailing muted value (e.g. "English"), not a helper under the title. */
  value?: string;
  icon: ReactElement<IconPropsType>;
  onPress?: () => void;
  showChevron?: boolean;
  tone?: "default" | "danger";
  accessibilityLabel?: string;
};

export function ProfileMenuRow({
  title,
  value,
  icon,
  onPress,
  showChevron = true,
  tone = "default",
  accessibilityLabel,
}: ProfileMenuRowProps) {
  const { theme } = useUnistyles();
  const titleColor = tone === "danger" ? "error" : "textPrimary";
  const content = (
    <>
      {icon}
      <Flex flex={1} style={styles.copy}>
        <Typography weight="medium" color={titleColor} numberOfLines={1}>
          {title}
        </Typography>
      </Flex>
      {value ? (
        <Typography size="text-sm" color="muted" numberOfLines={1}>
          {value}
        </Typography>
      ) : null}
      {showChevron ? (
        <ChevronRightIcon size={18} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  rowPressed: {
    backgroundColor: colors.slate2,
  },
  copy: {
    minWidth: 0,
  },
}));
