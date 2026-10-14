import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { SegmentedControl, Typography } from "@/components";

import type { FloorLayoutMode } from "../helpers/floor.types";

const LAYOUT_OPTIONS: { value: FloorLayoutMode; label: string }[] = [
  { value: "plan", label: "Plan" },
  { value: "cards", label: "Cards" },
];

export type FloorLayoutToolbarProps = {
  tableCount: number;
  layoutMode: FloorLayoutMode;
  onLayoutModeChange: (mode: FloorLayoutMode) => void;
};

export function FloorLayoutToolbar({
  tableCount,
  layoutMode,
  onLayoutModeChange,
}: FloorLayoutToolbarProps) {
  return (
    <View style={styles.row}>
      <Typography
        weight="semibold"
        size="text-lg"
        numberOfLines={1}
        style={styles.title}
      >
        Tables{tableCount > 0 ? ` · ${tableCount}` : ""}
      </Typography>
      <SegmentedControl
        size="sm"
        style={styles.switcher}
        options={LAYOUT_OPTIONS}
        value={layoutMode}
        onChange={onLayoutModeChange}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space(1.5),
    minHeight: space(4.5),
  },
  title: {
    flex: 1,
    flexShrink: 1,
  },
  switcher: {
    width: 168,
    flexShrink: 0,
  },
}));
