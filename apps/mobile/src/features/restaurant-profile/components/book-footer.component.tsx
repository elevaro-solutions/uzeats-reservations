import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button } from "@/components";

export type BookFooterProps = {
  bottomInset: number;
  onBook: () => void;
};

export function BookFooter({ bottomInset, onBook }: BookFooterProps) {
  return (
    <View
      style={[styles.footer, { paddingBottom: Math.max(bottomInset, 16) }]}
    >
      <Button fullWidth size="lg" onPress={onBook}>
        Book
      </Button>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
}));
