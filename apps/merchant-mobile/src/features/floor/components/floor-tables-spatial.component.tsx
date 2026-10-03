import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Empty, Flex, Typography } from "@/components";
import { guestDisplayName } from "@/lib/helpers";

import { floorStatusVisual } from "../helpers/floor-status.helpers";
import type { FloorTableState } from "../helpers/floor.types";

const CELL = 28;
const MIN_COLS = 8;
const MIN_ROWS = 6;

export type FloorTablesSpatialProps = {
  tables: FloorTableState[];
  visibleTables: FloorTableState[];
  selectedTableId?: string | null;
  seatingMode: boolean;
  onSelect: (state: FloorTableState) => void;
};

function shapeRadius(shape: string | null | undefined, size: number): number {
  if (shape === "round" || shape === "plant") return size / 2;
  if (shape === "booth") return 10;
  if (shape === "banquette") return 12;
  return 6;
}

export function FloorTablesSpatial({
  tables,
  visibleTables,
  selectedTableId,
  seatingMode,
  onSelect,
}: FloorTablesSpatialProps) {
  const { theme } = useUnistyles();

  const bounds = visibleTables.reduce(
    (acc, row) => {
      const t = row.table;
      const x = t.posX ?? 0;
      const y = t.posY ?? 0;
      const w = t.width || 2;
      const h = t.height || 2;
      return {
        maxX: Math.max(acc.maxX, x + w),
        maxY: Math.max(acc.maxY, y + h),
      };
    },
    { maxX: MIN_COLS, maxY: MIN_ROWS },
  );

  const width = Math.max(bounds.maxX, MIN_COLS) * CELL;
  const height = Math.max(bounds.maxY, MIN_ROWS) * CELL;

  return (
    <Flex gap={1.5}>
      <Typography weight="semibold" size="text-lg">
        Floor plan
        {visibleTables.length > 0 ? ` · ${visibleTables.length}` : ""}
      </Typography>

      {visibleTables.length === 0 ? (
        <Empty
          title="No tables"
          description={
            tables.length === 0
              ? "Add tables in Partner Hub to run floor ops."
              : "No tables in this area."
          }
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={[
              styles.canvas,
              {
                width,
                height,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {visibleTables.map((state) => {
              const t = state.table;
              const x = (t.posX ?? 0) * CELL;
              const y = (t.posY ?? 0) * CELL;
              const w = (t.width || 2) * CELL;
              const h = (t.height || 2) * CELL;
              const visual = floorStatusVisual(state.status, theme.colors);
              const selected = selectedTableId === t.id;
              const isFree = state.status === "free";
              const dimmed = seatingMode && !isFree;
              const guest = state.reservation
                ? guestDisplayName(state.reservation.diner)
                : null;

              return (
                <Pressable
                  key={t.id}
                  onPress={() => onSelect(state)}
                  style={[
                    styles.table,
                    {
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      borderRadius: shapeRadius(t.shape, Math.min(w, h)),
                      backgroundColor: visual.body,
                      borderColor: selected
                        ? theme.colors.primary
                        : visual.bodyBorder,
                      borderWidth: selected ? 2 : 1,
                      opacity: dimmed ? 0.45 : 1,
                      transform: [{ rotate: `${t.rotation ?? 0}deg` }],
                    },
                  ]}
                >
                  <Typography
                    size="text-xs"
                    weight="semibold"
                    style={{ color: visual.accent, textAlign: "center" }}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Typography>
                  {guest ? (
                    <Typography
                      size="text-xs"
                      style={{ color: visual.accent, textAlign: "center" }}
                      numberOfLines={1}
                    >
                      {guest}
                    </Typography>
                  ) : (
                    <Typography
                      size="text-xs"
                      style={{ color: visual.accent, opacity: 0.7 }}
                    >
                      {t.minCapacity}–{t.maxCapacity}
                    </Typography>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  canvas: {
    borderWidth: 1,
    borderRadius: radius.md,
    position: "relative",
    overflow: "hidden",
  },
  table: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(0.5),
  },
}));
