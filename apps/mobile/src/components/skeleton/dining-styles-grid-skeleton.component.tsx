import { useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { diningStyleGridMetrics } from "@/lib/dining-style-grid-layout";

import { Flex } from "../flex";

import { Skeleton } from "./skeleton.component";

export function DiningStylesGridSkeleton() {
  const { theme } = useUnistyles();
  const { width: windowWidth } = useWindowDimensions();
  const { cell, gutter, heroWidth, rowHeight, gridInnerWidth } =
    diningStyleGridMetrics(windowWidth, theme.space);

  const rows = [
    [{ width: heroWidth }, { width: cell }],
    [{ width: cell }, { width: cell }, { width: cell }],
  ];

  return (
    <Flex gap={1} style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[
            styles.row,
            { height: rowHeight, gap: gutter, width: gridInnerWidth },
          ]}
        >
          {row.map((tile, tileIndex) => (
            <Skeleton
              key={`tile-${rowIndex}-${tileIndex}`}
              width={tile.width}
              height={rowHeight}
              radius="lg"
            />
          ))}
        </View>
      ))}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  grid: {
    paddingHorizontal: space(2),
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
}));
