import { ReactElement, ReactNode } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { XIcon } from "@/assets";
import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

import { Typography, TypographySize } from "../typography";

export type ChipProps = {
  children: ReactNode;
  onPress?: () => void;
  onDismiss?: () => void;
  selected?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  icon?: ReactElement<IconPropsType>;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  icon,
  style,
  onPress,
  onDismiss,
  children,
  selected = false,
  size = "md",
}: ChipProps) {
  const { theme } = useUnistyles();
  styles.useVariants({ size, selected, dismissible: Boolean(onDismiss) });

  const textSize =
    `text-${size === "xs" ? "xs" : size === "lg" ? "md" : "sm"}` as TypographySize;

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      {renderIcon({ icon, style: styles.icon })}
      <Typography
        weight="semibold"
        size={textSize}
        color={selected ? "inverse" : "textPrimary"}
        numberOfLines={1}
      >
        {children}
      </Typography>
      {onDismiss ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            onDismiss();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove filter"
          style={styles.dismissBtn}
        >
          <XIcon
            size={14}
            color={selected ? theme.colors.slate5 : theme.colors.textPrimary}
          />
        </Pressable>
      ) : null}
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
        true: { color: colors.white },
        false: { color: colors.textPrimary },
      },
    },
  },
  dismissBtn: {
    marginLeft: space(0.25),
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
    borderWidth: 1.5,
    borderRadius: radius.lg,
    variants: {
      size: {
        xs: { paddingVertical: 4, paddingHorizontal: space(1.25) },
        sm: { paddingVertical: 6, paddingHorizontal: space(1.5) },
        md: { paddingVertical: 8, paddingHorizontal: space(2) },
        lg: { paddingVertical: 10, paddingHorizontal: space(2.5) },
      },
      selected: {
        true: {
          borderRadius: radius.full,
          borderColor: colors.textPrimary,
          backgroundColor: colors.textPrimary,
        },
        false: {
          borderColor: colors.slate3,
          backgroundColor: colors.slate1,
        },
      },
      dismissible: {
        true: { borderRadius: radius.full },
        false: {},
      },
    },
  },
}));
