import { Pressable, useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import {
  DINING_STYLE_TILES,
  type DiningStyleIconLayout,
  type DiningStyleTile,
} from "../data/dining-styles";

const COLS = 3;

const FALLBACK_LAYOUT: DiningStyleIconLayout = {
  sizeFactor: 0.68,
  rightFactor: 0.16,
  bottomFactor: 0.2,
  rotateDeg: 0,
  opacity: 0.82,
  strokeWidth: 1.65,
};

export type DiningStylesGridProps = {
  onSelect: (tile: DiningStyleTile) => void;
};

export function DiningStylesGrid({ onSelect }: DiningStylesGridProps) {
  const { theme } = useUnistyles();
  const { width: windowWidth } = useWindowDimensions();
  const gutter = theme.space(1);
  const padX = theme.space(2);
  const gridWidth = windowWidth - padX * 2;
  const cell = (gridWidth - gutter * (COLS - 1)) / COLS;
  const heroWidth = cell * 2 + gutter;
  const rowHeight = cell;

  return (
    <Flex gap={1} style={styles.grid}>
      {chunkTiles(DINING_STYLE_TILES).map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[styles.row, { height: rowHeight, gap: gutter }]}
        >
          {row.map((tile) => {
            const tileWidth = tile.span === 2 ? heroWidth : cell;
            const isMore = tile.kind === "more";
            const { Icon } = tile;

            if (isMore) {
              return (
                <Pressable
                  key={tile.id}
                  onPress={() => onSelect(tile)}
                  style={[
                    styles.tile,
                    { width: tileWidth, height: rowHeight },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="More dining styles"
                >
                  <Typography
                    weight="semibold"
                    size="text-sm"
                    color="textPrimary"
                    style={styles.label}
                  >
                    {tile.label}
                  </Typography>
                  <View style={styles.moreArrow}>
                    <Icon size={18} color={theme.colors.textPrimary} />
                  </View>
                </Pressable>
              );
            }

            const layout = tile.iconLayout ?? FALLBACK_LAYOUT;
            const iconSize = Math.round(rowHeight * layout.sizeFactor);
            const right = -Math.round(iconSize * layout.rightFactor);
            const bottom = -Math.round(iconSize * layout.bottomFactor);

            return (
              <Pressable
                key={tile.id}
                onPress={() => onSelect(tile)}
                style={[styles.tile, { width: tileWidth, height: rowHeight }]}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
              >
                <Typography
                  weight="semibold"
                  size={tile.span === 2 ? "text-md" : "text-sm"}
                  color="textPrimary"
                  style={styles.label}
                  numberOfLines={2}
                >
                  {tile.label}
                </Typography>
                <View
                  style={[
                    styles.iconCrop,
                    {
                      width: iconSize,
                      height: iconSize,
                      right,
                      bottom,
                      opacity: layout.opacity,
                      transform: [{ rotate: `${layout.rotateDeg}deg` }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Icon
                    size={iconSize}
                    color={theme.colors.accent6}
                    strokeWidth={layout.strokeWidth}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Flex>
  );
}

/** Group tiles into rows that fill 3 columns (span 2 + span 1, or three span 1). */
function chunkTiles(tiles: DiningStyleTile[]): DiningStyleTile[][] {
  const rows: DiningStyleTile[][] = [];
  let current: DiningStyleTile[] = [];
  let used = 0;

  for (const tile of tiles) {
    if (used + tile.span > COLS) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(tile);
    used += tile.span;
    if (used === COLS) {
      rows.push(current);
      current = [];
      used = 0;
    }
  }

  if (current.length > 0) rows.push(current);
  return rows;
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  grid: {
    paddingHorizontal: space(2),
  },
  row: {
    flexDirection: "row",
  },
  tile: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.slate2,
    justifyContent: "space-between",
    padding: space(1.5),
  },
  label: {
    alignSelf: "stretch",
    zIndex: 1,
  },
  iconCrop: {
    position: "absolute",
  },
  moreArrow: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
}));
