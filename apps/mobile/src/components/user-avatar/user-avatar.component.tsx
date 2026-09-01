import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "../typography";

export type UserAvatarProps = {
  firstName?: string;
  lastName?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "subtle";
};

function initials(firstName?: string, lastName?: string) {
  const a = firstName?.trim()?.[0] ?? "";
  const b = lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function UserAvatar({
  firstName,
  lastName,
  size = "md",
  variant = "primary",
}: UserAvatarProps) {
  styles.useVariants({ size, variant });

  return (
    <View style={styles.avatar}>
      <Typography
        weight="semibold"
        color={variant === "subtle" ? "textPrimary" : "inverse"}
        size={size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm"}
      >
        {initials(firstName, lastName)}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create(({ radius, colors }) => ({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    variants: {
      variant: {
        primary: { backgroundColor: colors.primary },
        subtle: { backgroundColor: colors.secondarySubtle },
      },
      size: {
        sm: { width: 32, height: 32 },
        md: { width: 40, height: 40 },
        lg: { width: 56, height: 56 },
      },
    },
  },
}));
