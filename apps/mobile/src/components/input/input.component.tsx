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
  onChangeText,
  placeholderTextColor,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  styles.useVariants({ size, error, disabled });

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
        style={[styles.field(focused), style as StyleProp<ViewStyle>]}
        onPress={() => undefined}
      >
        {prefix}
        <TextInput
          {...props}
          editable={editable && !disabled}
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
            placeholderTextColor ?? styles.placeholder.color
          }
          style={styles.input}
        />
        {suffix}
      </Pressable>
      {helperText ? (
        <Typography size="text-xs" color={error ? "error" : "secondary"}>
          {helperText}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  container: {
    gap: space(0.5),
    width: "100%",
  },
  label: {
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FONT_FAMILY.regular,
    padding: 0,
    margin: 0,
    variants: {
      size: {
        sm: { fontSize: 14, lineHeight: 20 },
        md: { fontSize: 16, lineHeight: 22 },
        lg: { fontSize: 18, lineHeight: 24 },
      },
    },
  },
  field: (focused: boolean) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: focused ? colors.primary6 : colors.border,
    backgroundColor: colors.background,
    variants: {
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
