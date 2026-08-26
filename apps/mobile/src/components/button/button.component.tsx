import { ReactElement, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { renderIcon } from "@/lib/helpers";
import { IconPropsType } from "@/types";

import {
  ButtonColor,
  ButtonColors,
  ButtonRadius,
  ButtonSize,
  ButtonState,
  ButtonVariant,
  getButtonColors,
} from "./helpers/get-button-colors.helper";
import { Typography } from "../typography";

export type ButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  color?: ButtonColor;
  radius?: ButtonRadius;
  variant?: ButtonVariant;
  endIcon?: ReactElement<IconPropsType>;
  startIcon?: ReactElement<IconPropsType>;
};

export function Button({
  style,
  endIcon,
  loading,
  onPress,
  children,
  disabled,
  startIcon,
  size = "md",
  fullWidth = false,
  color = "primary",
  radius = "rounded",
  variant = "filled",
}: ButtonProps) {
  const { theme } = useUnistyles();
  styles.useVariants({ size, corners: radius, variant });

  const isIconOnly = !children && Boolean(startIcon || endIcon);
  const isBusy = Boolean(loading);
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      style={styles.container(fullWidth)}
    >
      {({ pressed }) => {
        const state: ButtonState =
          isDisabled ? "disabled" : pressed ? "press" : "default";
        const colors = getButtonColors(theme, variant, color, state);
        const showLeadingSpinner = isBusy;

        return (
          <View style={[styles.button(colors, fullWidth, isIconOnly), style]}>
            {showLeadingSpinner ? (
              <ActivityIndicator size="small" color={colors.color} />
            ) : startIcon ? (
              renderIcon({ icon: startIcon, color: colors.color, style: styles.icon })
            ) : null}
            {typeof children === "string" ? (
              <Typography
                size={size === "sm" ? "text-xs" : size === "lg" || size === "xl" ? "text-md" : "text-sm"}
                weight="semibold"
                style={{ color: colors.color, opacity: isBusy ? 0.7 : 1 }}
              >
                {children}
              </Typography>
            ) : (
              children
            )}
            {endIcon && !isBusy
              ? renderIcon({ icon: endIcon, color: colors.color, style: styles.icon })
              : null}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: (fullWidth: boolean) => ({
    flexShrink: 1,
    maxWidth: "100%",
    width: fullWidth ? "100%" : "auto",
  }),
  icon: {
    variants: {
      size: {
        sm: { width: 18, height: 18 },
        md: { width: 20, height: 20 },
        lg: { width: 20, height: 20 },
        xl: { width: 22, height: 22 },
      },
    },
  },
  button: (colors: ButtonColors, fullWidth: boolean, isIconButton: boolean) => ({
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: fullWidth ? "100%" : "auto",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderColor,
    backgroundColor: colors.backgroundColor,
    variants: {
      corners: {
        rounded: { borderRadius: theme.radius.md },
        circular: { borderRadius: theme.radius.full },
      },
      size: {
        sm: {
          minHeight: 32,
          paddingVertical: 6,
          minWidth: isIconButton ? 32 : 96,
          paddingHorizontal: isIconButton ? 6 : 10,
        },
        md: {
          minHeight: 40,
          paddingVertical: 10,
          minWidth: isIconButton ? 40 : 110,
          paddingHorizontal: isIconButton ? 8 : 16,
        },
        lg: {
          minHeight: 44,
          paddingVertical: 10,
          minWidth: isIconButton ? 44 : 120,
          paddingHorizontal: isIconButton ? 10 : 18,
        },
        xl: {
          minHeight: 48,
          paddingVertical: 12,
          minWidth: isIconButton ? 48 : 128,
          paddingHorizontal: isIconButton ? 12 : 20,
        },
      },
      variant: {
        text: { borderWidth: 0 },
        ghost: {},
        outlined: {},
        filled: {},
      },
    },
  }),
}));
