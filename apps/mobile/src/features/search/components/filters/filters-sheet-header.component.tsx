import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type FiltersSheetHeaderProps = {
  activeFilterCount: number;
  onClearAll: () => void;
};

export function FiltersSheetHeader({
  activeFilterCount,
  onClearAll,
}: FiltersSheetHeaderProps) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      style={styles.sheetHeader}
    >
      <Flex gap={0.25} flex={1}>
        <Typography size="text-xl" weight="bold">
          Filters
        </Typography>
        <Typography size="text-sm" color="secondary">
          {activeFilterCount === 0
            ? "No facets selected"
            : `${activeFilterCount} facet${activeFilterCount === 1 ? "" : "s"} selected`}
        </Typography>
      </Flex>
      {activeFilterCount > 0 ? (
        <Pressable
          onPress={onClearAll}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear facet filters"
        >
          <Typography size="text-sm" weight="semibold" color="primary">
            Clear facets
          </Typography>
        </Pressable>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors }) => ({
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
}));
