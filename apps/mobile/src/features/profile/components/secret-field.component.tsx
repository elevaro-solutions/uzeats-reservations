import { useState } from "react";
import { Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";

import { EyeIcon, EyeOffIcon } from "@/assets";
import { Input } from "@/components";

export type SecretFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  helperText?: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password" | "password";
};

export function SecretField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  helperText,
  placeholder,
  autoComplete,
}: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const { theme } = useUnistyles();

  return (
    <Input
      label={label}
      value={value}
      onBlur={onBlur}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoComplete={autoComplete}
      textContentType="password"
      error={Boolean(error)}
      helperText={error ?? helperText}
      suffix={
        <Pressable
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOffIcon size={20} color={theme.colors.textMuted} />
          ) : (
            <EyeIcon size={20} color={theme.colors.textMuted} />
          )}
        </Pressable>
      }
    />
  );
}
