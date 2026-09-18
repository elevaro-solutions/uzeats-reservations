import { type ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function LoyaltyStatBadge({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.statBadge, { backgroundColor }]}>{children}</View>
  );
}

const styles = StyleSheet.create(({ radius }) => ({
  statBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
}));
