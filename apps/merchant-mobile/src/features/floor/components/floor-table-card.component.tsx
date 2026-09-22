import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { Typography } from "@/components";

import { floorStatusVisual } from "../helpers/floor-status.helpers";
import {
  floorTableChairDistribution,
  floorTableSizeBucket,
  floorTableWidth,
} from "../helpers/floor-table-size.helpers";

export type FloorTableCardTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
};

export type FloorTableCardProps = {
  status: string;
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

function ChairPills({
  count,
  axis,
  color,
}: {
  count: number;
  axis: "horizontal" | "vertical";
  color: string;
}) {
  if (count <= 0) return null;
  return (
    <View
      style={axis === "horizontal" ? styles.chairRow : styles.chairCol}
      pointerEvents="none"
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={`${axis}-${i}`}
          style={[
            axis === "horizontal" ? styles.chairH : styles.chairV,
            { backgroundColor: color },
          ]}
        />
      ))}
    </View>
  );
}

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
        <ChairPills
          count={chairs.top}
          axis="horizontal"
          color={visual.chairs}
        />

        <View style={styles.midRow}>
          <ChairPills
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
          <ChairPills
            count={chairs.right}
            axis="vertical"
            color={visual.chairs}
          />
        </View>

        <ChairPills
          count={chairs.bottom}
          axis="horizontal"
          color={visual.chairs}
        />
      </View>
    </Pressable>
  );
}

/** Clear air between chairs and the white tabletop (matches Book-a-Table mock). */
const CHAIR_GAP = 10;

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
      selected: {
        true: {},
        false: {},
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
    backgroundColor: colors.white,
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
    gap: CHAIR_GAP,
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
    gap: CHAIR_GAP,
    variants: {
      size: {
        two: {},
        four: {},
        six: {},
        banquet: { alignSelf: "stretch" },
      },
    },
  },
  chairRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
  },
  chairCol: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
  },
  chairH: {
    width: 26,
    height: 9,
    borderRadius: radius.full,
  },
  chairV: {
    width: 9,
    height: 26,
    borderRadius: radius.full,
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.25),
    paddingHorizontal: space(0.75),
    paddingVertical: space(0.75),
    borderRadius: radius.md,
    borderWidth: 1.5,
    // Compact tabletop — do not stretch to fill the wash card
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
