import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { Button, Flex } from "@/components";

export type FiltersSheetFooterProps = {
  onCancel: () => void;
  onApply: () => void;
};

export function FiltersSheetFooter({
  onCancel,
  onApply,
}: FiltersSheetFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <Flex
      direction="row"
      gap={1}
      style={[
        styles.sheetFooter,
        { paddingBottom: insets.bottom + styles.footerPad.padding },
      ]}
    >
      <View style={styles.footerBtn}>
        <Button
          variant="outlined"
          color="secondary"
          size="xl"
          fullWidth
          onPress={onCancel}
        >
          Cancel
        </Button>
      </View>
      <View style={styles.footerBtn}>
        <Button size="xl" fullWidth onPress={onApply}>
          Apply filters
        </Button>
      </View>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  sheetFooter: {
    width: "100%",
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
  footerPad: {
    padding: space(2),
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
}));
