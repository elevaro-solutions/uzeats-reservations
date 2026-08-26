import { ReactElement, ReactNode } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

import { Typography, TypographySize } from "../typography";

export type ChipProps = {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  icon?: ReactElement<IconPropsType>;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  icon,
  style,
  onPress,
  children,
  selected = false,
  size = "md",
}: ChipProps) {
  styles.useVariants({ size, selected });

  const textSize = (`text-${size === "xs" ? "xs" : size === "lg" ? "md" : "sm"}`) as TypographySize;

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      {renderIcon({ icon, style: styles.icon })}
      <Typography weight="medium" size={textSize} color="textPrimary">
        {children}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  icon: {
    variants: {
      size: {
        xs: { width: 14, height: 14 },
        sm: { width: 16, height: 16 },
        md: { width: 18, height: 18 },
        lg: { width: 20, height: 20 },
      },
      selected: {
        true: { color: colors.primary },
        false: { color: colors.textSecondary },
      },
    },
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
    borderWidth: 1,
    borderRadius: radius.full,
    variants: {
      size: {
        xs: { paddingVertical: 4, paddingHorizontal: space(1) },
        sm: { paddingVertical: 6, paddingHorizontal: space(1.25) },
        md: { paddingVertical: 8, paddingHorizontal: space(1.5) },
        lg: { paddingVertical: 10, paddingHorizontal: space(2) },
      },
      selected: {
        true: {
          borderColor: colors.primary,
          backgroundColor: colors.primarySubtle,
        },
        false: {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      },
    },
  },
}));
