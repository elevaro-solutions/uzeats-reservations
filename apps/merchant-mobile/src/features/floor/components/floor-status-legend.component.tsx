import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Typography } from "@/components";

import {
  FLOOR_STATUS_LEGEND,
  floorStatusLabel,
  floorStatusVisual,
} from "../helpers/floor-status.helpers";

export function FloorStatusLegend() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.row} accessibilityRole="summary">
      {FLOOR_STATUS_LEGEND.map((status) => {
        const visual = floorStatusVisual(status, theme.colors);
        return (
          <View key={status} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: visual.swatch }]} />
            <Typography size="text-xs" color="secondary">
              {floorStatusLabel(status)}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space(2),
    rowGap: space(1),
    alignItems: "center",
    paddingVertical: space(0.25),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.slate4,
  },
}));
