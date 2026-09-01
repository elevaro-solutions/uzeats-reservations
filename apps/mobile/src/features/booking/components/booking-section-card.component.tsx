import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/components";

export type BookingSectionCardProps = {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BookingSectionCard({
  title,
  children,
  style,
}: BookingSectionCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <Typography weight="semibold" size="text-md">
          {title}
        </Typography>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    marginHorizontal: space(2),
    padding: space(2),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: space(1.5),
  },
}));
