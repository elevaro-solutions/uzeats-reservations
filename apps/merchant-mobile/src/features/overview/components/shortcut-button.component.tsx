import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, Typography } from "@/components";

export type ShortcutButtonProps = {
  label: string;
  onPress: () => void;
  icon: ReactNode;
};

export function ShortcutButton({
  label,
  onPress,
  icon,
}: ShortcutButtonProps) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Flex direction="row" alignItems="center" justifyContent="space-between">
        <Flex direction="row" alignItems="center" gap={1.5}>
          {icon}
          <Typography weight="semibold" size="text-md">
            {label}
          </Typography>
        </Flex>
        <ChevronRightIcon size={18} color={theme.colors.textMuted} />
      </Flex>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  shortcut: {
    minHeight: space(7),
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
}));
