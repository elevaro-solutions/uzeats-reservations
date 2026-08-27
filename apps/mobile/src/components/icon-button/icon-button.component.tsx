import { ReactElement } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

export type IconButtonProps = {
  icon: ReactElement<IconPropsType>;
  onPress?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "surface";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

const ICON_SIZES = {
  sm: 18,
  md: 20,
  lg: 24,
} as const;

export function IconButton({
  icon,
  style,
  onPress,
  disabled = false,
  size = "md",
  variant = "ghost",
  accessibilityLabel,
}: IconButtonProps) {
  const { theme } = useUnistyles();
  styles.useVariants({ size, variant });
  const iconSize = ICON_SIZES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {renderIcon({
        icon,
        color: theme.colors.textPrimary,
        style: { width: iconSize, height: iconSize },
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ radius, colors }) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    variants: {
      size: {
        sm: { width: 36, height: 36, borderRadius: radius.md },
        md: { width: 44, height: 44, borderRadius: radius.lg },
        lg: { width: 52, height: 52, borderRadius: radius.lg },
      },
      variant: {
        ghost: { backgroundColor: "transparent" },
        surface: { backgroundColor: colors.surface },
      },
    },
  },
  pressed: {
    opacity: 0.72,
  },
}));
