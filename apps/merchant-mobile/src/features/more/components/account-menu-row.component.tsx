import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronRightIcon } from "@/assets";
import { Flex, Typography } from "@/components";

export type AccountMenuRowProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  /** Hide bottom border when last in a grouped list. */
  showDivider?: boolean;
};

export function AccountMenuRow({
  label,
  icon,
  onPress,
  showDivider = false,
}: AccountMenuRowProps) {
  const { theme } = useUnistyles();

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Flex direction="row" alignItems="center" justifyContent="space-between">
          <Flex direction="row" alignItems="center" gap={1.5}>
            {icon}
            <Typography weight="medium" size="text-md">
              {label}
            </Typography>
          </Flex>
          <ChevronRightIcon size={18} color={theme.colors.textMuted} />
        </Flex>
      </Pressable>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  row: {
    minHeight: space(6.5),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    justifyContent: "center",
  },
  rowPressed: {
    opacity: 0.72,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: space(2) + 22 + space(1.5),
  },
}));
