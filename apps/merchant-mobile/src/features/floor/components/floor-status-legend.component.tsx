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
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: visual.swatch,
                  borderColor: visual.bodyBorder,
                },
              ]}
            />
            <Typography size="text-sm" color="secondary" weight="medium">
              {floorStatusLabel(status)}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space(2.5),
    rowGap: space(1.25),
    alignItems: "center",
    paddingVertical: space(0.5),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
}));
