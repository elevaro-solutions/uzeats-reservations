import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { Typography } from "@/components";
import { guestDisplayName } from "@/lib/helpers";

import {
  spatialChairMetrics,
  spatialTableRadii,
} from "../helpers/floor-spatial.helpers";
import { floorStatusVisual } from "../helpers/floor-status.helpers";
import { floorTableChairDistribution } from "../helpers/floor-table-size.helpers";
import type { FloorTableState } from "../helpers/floor.types";
import { FloorTableChairs } from "./floor-table-chairs.component";

export type FloorSpatialTableProps = {
  state: FloorTableState;
  cell: number;
  originX: number;
  originY: number;
  selected: boolean;
  seatingMode: boolean;
  onSelect: (state: FloorTableState) => void;
};

export function FloorSpatialTable({
  state,
  cell,
  originX,
  originY,
  selected,
  seatingMode,
  onSelect,
}: FloorSpatialTableProps) {
  const { theme } = useUnistyles();
  const t = state.table;
  const w = (t.width || 2) * cell;
  const h = (t.height || 2) * cell;
  const visual = floorStatusVisual(state.status, theme.colors);
  const isFree = state.status === "free";
  const dimmed = seatingMode && !isFree;
  const seatTarget = seatingMode && isFree;
  const guest = state.reservation
    ? guestDisplayName(state.reservation.diner)
    : null;
  const chairs = floorTableChairDistribution(t.maxCapacity);
  const metrics = spatialChairMetrics(cell);
  const showChairs = w >= 64 && h >= 56;
  const showMeta = Math.min(w, h) >= 56;
  const radii = spatialTableRadii(t.shape, Math.min(w, h) * 0.62);
  const rotation = t.rotation ?? 0;

  const secondary =
    state.status === "turning" && state.turnMinutesRemaining != null
      ? `${state.turnMinutesRemaining}m left`
      : guest
        ? guest
        : state.status === "reserved"
          ? "Reserved"
          : `${t.minCapacity}–${t.maxCapacity}`;

  return (
    <Pressable
      onPress={() => onSelect(state)}
      disabled={dimmed}
      accessibilityRole="button"
      accessibilityState={{ disabled: dimmed, selected }}
      accessibilityLabel={`Table ${t.name}, ${visual.label}${
        seatTarget
          ? selected
            ? ", selected to seat"
            : ", available to seat"
          : dimmed
            ? ", unavailable while seating"
            : ""
      }`}
      style={({ pressed }) => [
        styles.anchor,
        {
          left: (t.posX ?? 0) * cell - originX * cell,
          top: (t.posY ?? 0) * cell - originY * cell,
          width: w,
          height: h,
          zIndex: selected ? 5 : 2,
          opacity: dimmed ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.furniture,
          {
            width: w,
            height: h,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        {showChairs ? (
          <FloorTableChairs
            count={chairs.top}
            axis="horizontal"
            color={visual.chairs}
            length={metrics.length}
            thickness={metrics.thickness}
            gap={metrics.gap}
          />
        ) : null}

        <View style={styles.midRow}>
          {showChairs ? (
            <FloorTableChairs
              count={chairs.left}
              axis="vertical"
              color={visual.chairs}
              length={metrics.length}
              thickness={metrics.thickness}
              gap={metrics.gap}
            />
          ) : null}
          <View
            style={[
              styles.body,
              radii,
              {
                backgroundColor: visual.body,
                borderColor: selected
                  ? theme.colors.primary
                  : visual.bodyBorder,
                borderWidth: selected ? 2 : 1.5,
              },
            ]}
          />
          {showChairs ? (
            <FloorTableChairs
              count={chairs.right}
              axis="vertical"
              color={visual.chairs}
              length={metrics.length}
              thickness={metrics.thickness}
              gap={metrics.gap}
            />
          ) : null}
        </View>

        {showChairs ? (
          <FloorTableChairs
            count={chairs.bottom}
            axis="horizontal"
            color={visual.chairs}
            length={metrics.length}
            thickness={metrics.thickness}
            gap={metrics.gap}
          />
        ) : null}
      </View>

      <View pointerEvents="none" style={styles.labelWrap}>
        <Typography
          size="text-xs"
          weight="semibold"
          numberOfLines={1}
          style={{ color: visual.accent, textAlign: "center" }}
        >
          {t.name}
        </Typography>
        {showMeta ? (
          <Typography
            size="text-xs"
            numberOfLines={1}
            style={{ color: visual.accent, opacity: 0.72, textAlign: "center" }}
          >
            {secondary}
          </Typography>
        ) : null}
      </View>

      {seatTarget ? (
        <View
          style={[styles.seatHint, selected && styles.seatHintChecked]}
          pointerEvents="none"
        >
          {selected ? (
            <CheckIcon size={10} color={theme.colors.white} strokeWidth={2.5} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  anchor: {
    position: "absolute",
  },
  furniture: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: space(0.5),
  },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flex: 1,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
    alignSelf: "stretch",
    minWidth: 28,
    minHeight: 22,
  },
  labelWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(0.5),
  },
  seatHint: {
    position: "absolute",
    top: space(0.25),
    right: space(0.25),
    zIndex: 2,
    width: space(2),
    height: space(2),
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  seatHintChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
}));
