import { useState } from "react";
import { Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

import { EyeIcon, EyeOffIcon } from "@/assets";
import { Input } from "@/components";

export type PasswordFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  error?: string;
};

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label = "Password",
  placeholder = "Enter your password",
  error,
}: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const { theme } = useUnistyles();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <Input
          label={label}
          required
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
          placeholder={placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={Boolean(error)}
          helperText={error}
          suffix={
            <Pressable
              hitSlop={8}
              onPress={() => setVisible((v) => !v)}
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
      )}
    />
  );
}
