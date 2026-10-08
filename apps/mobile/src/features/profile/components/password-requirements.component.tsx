import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { Flex, Typography } from "@/components";

const PASSWORD_CHECKS = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "lower", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "One number", test: (value: string) => /\d/.test(value) },
] as const;

export function PasswordRequirements({ value }: { value: string }) {
  const { theme } = useUnistyles();

  return (
    <Flex gap={0.5}>
      {PASSWORD_CHECKS.map((check) => {
        const ok = check.test(value);
        return (
          <Flex key={check.id} direction="row" alignItems="center" gap={1}>
            {ok ? (
              <CheckIcon size={14} color={theme.colors.success} />
            ) : (
              <View style={styles.unmetDot} />
            )}
            <Typography size="text-xs" color={ok ? "success" : "muted"}>
              {check.label}
            </Typography>
          </Flex>
        );
      })}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  unmetDot: {
    width: space(1.75),
    height: space(1.75),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
}));
