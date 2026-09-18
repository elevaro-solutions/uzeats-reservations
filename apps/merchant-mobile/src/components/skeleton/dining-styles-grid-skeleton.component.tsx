import { useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex } from "../flex";

import { Skeleton } from "./skeleton.component";

const COLS = 3;

export function DiningStylesGridSkeleton() {
  const { theme } = useUnistyles();
  const { width: windowWidth } = useWindowDimensions();
  const gutter = theme.space(1);
  const padX = theme.space(2);
  const gridWidth = windowWidth - padX * 2;
  const cell = (gridWidth - gutter * (COLS - 1)) / COLS;
  const heroWidth = cell * 2 + gutter;
  const rowHeight = cell;

  const rows = [
    [{ width: heroWidth }, { width: cell }],
    [{ width: cell }, { width: cell }, { width: cell }],
  ];

  return (
    <Flex gap={1} style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[styles.row, { height: rowHeight, gap: gutter }]}
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
  },
  row: {
    flexDirection: "row",
  },
}));
