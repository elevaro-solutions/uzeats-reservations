import { Image, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { browserMediaUrl } from "@reservations/shared";

import { Typography } from "../typography";

export type UserAvatarProps = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
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
  avatarUrl,
  size = "md",
  variant = "primary",
}: UserAvatarProps) {
  styles.useVariants({ size, variant });
  const photo = avatarUrl ? browserMediaUrl(avatarUrl) : "";

  return (
    <View style={styles.avatar}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <Typography
          weight="semibold"
          color={variant === "subtle" ? "textPrimary" : "inverse"}
          size={
            size === "xl" || size === "lg"
              ? "text-lg"
              : size === "sm"
                ? "text-xs"
                : "text-sm"
          }
        >
          {initials(firstName, lastName)}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create(({ radius, colors, space }) => ({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
        xl: { width: space(10), height: space(10) },
      },
    },
  },
  photo: {
    width: "100%",
    height: "100%",
  },
}));
