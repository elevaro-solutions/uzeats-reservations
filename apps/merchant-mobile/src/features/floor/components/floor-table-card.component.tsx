import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { Typography } from "@/components";

import type { FloorTableStatus } from "../helpers/floor-status.helpers";
import { floorStatusVisual } from "../helpers/floor-status.helpers";
import {
  floorTableChairDistribution,
  floorTableSizeBucket,
  floorTableWidth,
} from "../helpers/floor-table-size.helpers";
import { FloorTableChairs } from "./floor-table-chairs.component";

export type FloorTableCardTable = {
  id: string;
  name: string;
  maxCapacity: number;
};

export type FloorTableCardProps = {
  status: FloorTableStatus;
  table: FloorTableCardTable;
  guestLabel?: string | null;
  turnMinutesRemaining?: number | null;
  selected?: boolean;
  /** When seating an arriving guest: emphasize free tables as targets. */
  seatTarget?: boolean;
  /** When seating an arriving guest: de-emphasize and disable non-free tables. */
  dimmed?: boolean;
  onPress: () => void;
};

export function FloorTableCard({
  status,
  table,
  guestLabel,
  turnMinutesRemaining,
  selected = false,
  seatTarget = false,
  dimmed = false,
  onPress,
}: FloorTableCardProps) {
  const { theme } = useUnistyles();
  const bucket = floorTableSizeBucket(table.maxCapacity);
  const chairs = floorTableChairDistribution(table.maxCapacity);
  const visual = floorStatusVisual(status, theme.colors);
  styles.useVariants({ size: bucket, selected });

  const secondary =
    status === "turning" && turnMinutesRemaining != null
      ? `${turnMinutesRemaining}m left`
      : guestLabel
        ? guestLabel
        : status === "reserved"
          ? "Reserved"
          : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={dimmed}
      accessibilityRole="button"
      accessibilityState={{ disabled: dimmed, selected }}
      accessibilityLabel={`Table ${table.name}, ${visual.label}${
        seatTarget
          ? selected
            ? ", selected to seat"
            : ", available to seat"
          : dimmed
            ? ", unavailable while seating"
            : ""
      }`}
      style={({ pressed }) => [
        styles.tile,
        {
          width: floorTableWidth(bucket),
          backgroundColor: visual.wash,
        },
        dimmed && styles.dimmed,
        pressed && !dimmed && styles.pressed,
      ]}
    >
      {seatTarget ? (
        <View
          style={[styles.seatHint, selected && styles.seatHintChecked]}
          pointerEvents="none"
        >
          {selected ? (
            <CheckIcon size={12} color={theme.colors.white} strokeWidth={2.5} />
          ) : null}
        </View>
      ) : null}
      {/*
        Inspiration furniture: top chairs → left | white table | right → bottom chairs.
        Status tints wash, chairs, tabletop, border, and label for scanability.
      */}
      <View style={styles.furniture}>
        <FloorTableChairs
          count={chairs.top}
          axis="horizontal"
          color={visual.chairs}
        />

        <View style={styles.midRow}>
          <FloorTableChairs
            count={chairs.left}
            axis="vertical"
            color={visual.chairs}
          />
          <View
            style={[
              styles.body,
              {
                backgroundColor: visual.body,
                borderColor: selected
                  ? theme.colors.primary
                  : visual.bodyBorder,
              },
            ]}
          >
            <Typography
              weight="semibold"
              size="text-sm"
              numberOfLines={1}
              style={{ color: visual.accent }}
            >
              {table.name}
            </Typography>
            {secondary ? (
              <Typography
                size="text-xs"
                numberOfLines={1}
                style={{ color: visual.accent, opacity: 0.75 }}
              >
                {secondary}
              </Typography>
            ) : null}
          </View>
          <FloorTableChairs
            count={chairs.right}
            axis="vertical"
            color={visual.chairs}
          />
        </View>

        <FloorTableChairs
          count={chairs.bottom}
          axis="horizontal"
          color={visual.chairs}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  tile: {
    maxWidth: "100%",
    borderRadius: radius.lg,
    borderWidth: 0,
    paddingHorizontal: space(1.25),
    paddingVertical: space(1.25),
    alignItems: "center",
    justifyContent: "center",
    variants: {
      size: {
        two: { minHeight: space(14) },
        four: { minHeight: space(15) },
        six: { minHeight: space(15) },
        banquet: { minHeight: space(15) },
      },
    },
  },
  seatHint: {
    position: "absolute",
    top: space(0.75),
    right: space(0.75),
    zIndex: 1,
    width: space(2.25),
    height: space(2.25),
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.slate12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  seatHintChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dimmed: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
  },
  furniture: {
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
    variants: {
      size: {
        two: {},
        four: {},
        six: {},
        banquet: { alignSelf: "stretch" },
      },
    },
  },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
    variants: {
      size: {
        two: {},
        four: {},
        six: {},
        banquet: { alignSelf: "stretch" },
      },
    },
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.25),
    paddingHorizontal: space(0.75),
    paddingVertical: space(0.75),
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexGrow: 0,
    flexShrink: 0,
    variants: {
      size: {
        two: {
          width: space(10),
          minHeight: space(5.5),
        },
        four: {
          width: space(11.5),
          minHeight: space(6),
        },
        six: {
          width: space(12.5),
          minHeight: space(6.5),
        },
        banquet: {
          flexGrow: 1,
          flexShrink: 1,
          alignSelf: "stretch",
          minHeight: space(6.5),
          paddingHorizontal: space(1.25),
        },
      },
      selected: {
        true: {
          borderWidth: 2,
        },
        false: {},
      },
    },
  },
}));
