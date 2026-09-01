import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

export type FilterSectionHeaderProps = {
  title: string;
  selectedCount?: number;
};

export function FilterSectionHeader({
  title,
  selectedCount = 0,
}: FilterSectionHeaderProps) {
  return (
    <Flex direction="row" alignItems="center" gap={1} style={styles.row}>
      <Typography size="text-sm" weight="semibold" color="textPrimary">
        {title}
      </Typography>
      {selectedCount > 0 ? (
        <View style={styles.badge}>
          <Typography size="text-xs" weight="semibold" color="primary">
            {selectedCount}
          </Typography>
        </View>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  row: {
    minHeight: space(3),
  },
  badge: {
    minWidth: space(2.25),
    height: space(2.25),
    paddingHorizontal: space(0.75),
    borderRadius: radius.full,
    backgroundColor: colors.primary3,
    alignItems: "center",
    justifyContent: "center",
  },
}));
