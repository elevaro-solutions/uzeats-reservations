import { ReactNode, useState } from "react";
import {
  Pressable,
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { FONT_FAMILY } from "@/lib/fonts";

import { Typography } from "../typography";

const MULTILINE_LINE_HEIGHT = {
  sm: 20,
  md: 22,
  lg: 24,
} as const;

export type InputProps = TextInputProps & {
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  containerStyle?: StyleProp<ViewStyle>;
  onChangeText?: (text: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function Input({
  label,
  style,
  prefix,
  suffix,
  helperText,
  size = "md",
  error = false,
  containerStyle,
  required = false,
  disabled = false,
  editable = true,
  multiline = false,
  numberOfLines,
  onChangeText,
  placeholderTextColor,
  textAlignVertical,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  styles.useVariants({ size, error, disabled, multiline });

  const multilineLines = Math.max(numberOfLines ?? 3, 3);
  const fieldPaddingY = size === "sm" ? 12 : size === "lg" ? 20 : 16;
  const multilineMinHeight = multiline
    ? MULTILINE_LINE_HEIGHT[size] * multilineLines + fieldPaddingY
    : undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Typography size="text-sm" weight="medium" style={styles.label}>
          {label}
          {required ? (
            <Typography size="text-sm" color="error">
              {" "}
              *
            </Typography>
          ) : null}
        </Typography>
      ) : null}
      <Pressable
        disabled={disabled}
        style={[
          styles.field(focused),
          multilineMinHeight ? { minHeight: multilineMinHeight } : null,
          style as StyleProp<ViewStyle>,
        ]}
        onPress={() => undefined}
      >
        {prefix}
        <TextInput
          {...props}
          multiline={multiline}
          numberOfLines={multiline ? multilineLines : numberOfLines}
          editable={editable && !disabled}
          accessibilityState={{ disabled }}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={
            placeholderTextColor ??
            (disabled
              ? styles.placeholderDisabled.color
              : styles.placeholder.color)
          }
          textAlignVertical={
            textAlignVertical ?? (multiline ? "top" : "center")
          }
          style={[
            styles.input,
            multiline
              ? {
                  lineHeight: MULTILINE_LINE_HEIGHT[size],
                  minHeight: MULTILINE_LINE_HEIGHT[size] * multilineLines,
                }
              : null,
          ]}
        />
        {suffix}
      </Pressable>
      {helperText ? (
        <Typography size="text-xs" style={styles.helperText}>
          {helperText}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  container: {
    width: "100%",
  },
  label: {
    color: colors.textPrimary,
    marginBottom: space(0.5),
  },
  helperText: {
    marginTop: space(1),
    color: colors.textMuted,
    variants: {
      size: {
        sm: { paddingHorizontal: space(1.5) },
        md: { paddingHorizontal: space(2) },
        lg: { paddingHorizontal: space(2) },
      },
      error: {
        true: { color: colors.errorPress },
        false: {},
      },
    },
  },
  placeholder: {
    color: colors.textMuted,
  },
  placeholderDisabled: {
    color: colors.slate7,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FONT_FAMILY.regular,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    variants: {
      multiline: {
        true: { alignSelf: "stretch" },
        false: {},
      },
      size: {
        sm: { fontSize: 14 },
        md: { fontSize: 16 },
        lg: { fontSize: 18 },
      },
      disabled: {
        true: { color: colors.slate7 },
        false: {},
      },
    },
  },
  field: (focused: boolean) => ({
    flexDirection: "row",
    gap: space(1),
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: focused ? colors.primary6 : colors.border,
    backgroundColor: colors.background,
    variants: {
      multiline: {
        true: { alignItems: "flex-start" },
        false: { alignItems: "center" },
      },
      size: {
        sm: {
          minHeight: 36,
          paddingHorizontal: space(1.5),
          paddingVertical: space(0.75),
        },
        md: {
          minHeight: 44,
          paddingHorizontal: space(2),
          paddingVertical: space(1),
        },
        lg: {
          minHeight: 52,
          paddingHorizontal: space(2),
          paddingVertical: space(1.25),
        },
      },
      error: {
        true: { borderColor: colors.error },
        false: {},
      },
      disabled: {
        true: {
          backgroundColor: colors.slate2,
          borderColor: colors.slate3,
        },
        false: {},
      },
    },
  }),
}));
