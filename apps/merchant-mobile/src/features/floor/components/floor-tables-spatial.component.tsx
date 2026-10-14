import { useCallback, useMemo, useState } from "react";
import { type LayoutChangeEvent, ScrollView, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Empty } from "@/components";

import {
  floorSpatialBounds,
  floorSpatialCellSize,
} from "../helpers/floor-spatial.helpers";
import type { FloorTableState } from "../helpers/floor.types";
import { FloorSpatialTable } from "./floor-spatial-table.component";

export type FloorTablesSpatialProps = {
  tables: FloorTableState[];
  visibleTables: FloorTableState[];
  selectedTableId?: string | null;
  seatingMode: boolean;
  onSelect: (state: FloorTableState) => void;
};

export function FloorTablesSpatial({
  tables,
  visibleTables,
  selectedTableId,
  seatingMode,
  onSelect,
}: FloorTablesSpatialProps) {
  const { theme } = useUnistyles();
  const [roomWidth, setRoomWidth] = useState(0);

  const onRoomLayout = useCallback((event: LayoutChangeEvent) => {
    setRoomWidth(event.nativeEvent.layout.width);
  }, []);

  const bounds = useMemo(
    () => floorSpatialBounds(visibleTables),
    [visibleTables],
  );
  const cell = floorSpatialCellSize(roomWidth, bounds.cols);
  const canvasWidth = roomWidth > 0 ? bounds.cols * cell : 0;
  const canvasHeight = roomWidth > 0 ? bounds.rows * cell : 0;
  const fitsWidth = roomWidth <= 0 || canvasWidth <= roomWidth;

  if (visibleTables.length === 0) {
    return (
      <Empty
        title="No tables"
        description={
          tables.length === 0
            ? "Add tables in Partner Hub to run floor ops."
            : "No tables in this area."
        }
      />
    );
  }

  const canvas = (
    <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
      {cell > 0 ? (
        <Svg
          width={canvasWidth}
          height={canvasHeight}
          style={styles.grid}
          pointerEvents="none"
        >
          <Defs>
            <Pattern
              id="floor-spatial-grid"
              width={cell}
              height={cell}
              patternUnits="userSpaceOnUse"
            >
              <Path
                d={`M ${cell} 0 L 0 0 0 ${cell}`}
                stroke={theme.colors.slate4}
                strokeWidth={1}
                strokeOpacity={0.4}
                fill="none"
              />
            </Pattern>
          </Defs>
          <Rect
            width={canvasWidth}
            height={canvasHeight}
            fill="url(#floor-spatial-grid)"
          />
        </Svg>
      ) : null}
      {visibleTables.map((state) => (
        <FloorSpatialTable
          key={state.table.id}
          state={state}
          cell={cell}
          originX={bounds.minX}
          originY={bounds.minY}
          selected={selectedTableId === state.table.id}
          seatingMode={seatingMode}
          onSelect={onSelect}
        />
      ))}
    </View>
  );

  return (
    <View
      onLayout={onRoomLayout}
      style={[
        styles.room,
        {
          backgroundColor: theme.colors.slate2,
          borderColor: theme.colors.slate3,
          minHeight: canvasHeight || theme.space(28),
        },
      ]}
    >
      {fitsWidth ? (
        <View style={styles.centered}>{canvas}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {canvas}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create(({ radius }) => ({
  room: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  hScroll: {
    alignItems: "center",
  },
  canvas: {
    position: "relative",
    overflow: "visible",
  },
  grid: {
    position: "absolute",
    top: 0,
    left: 0,
  },
}));
