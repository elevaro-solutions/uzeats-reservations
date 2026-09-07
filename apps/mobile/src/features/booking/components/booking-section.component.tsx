import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/components";

export type BookingSectionProps = {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BookingSection({
  title,
  children,
  style,
}: BookingSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <Typography size="text-xs" weight="medium" color="secondary">
          {title}
        </Typography>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  section: {
    marginHorizontal: space(2),
    gap: space(2),
  },
}));
