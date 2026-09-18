import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

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
  onPress: () => void;
};

function ChairPills({
  count,
  axis,
}: {
  count: number;
  axis: "horizontal" | "vertical";
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
          style={axis === "horizontal" ? styles.chairH : styles.chairV}
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
      accessibilityRole="button"
      accessibilityLabel={`Table ${table.name}, ${visual.label}`}
      style={({ pressed }) => [
        styles.tile,
        {
          width: floorTableWidth(bucket),
          backgroundColor: visual.wash,
        },
        pressed && styles.pressed,
      ]}
    >
      {/*
        Inspiration furniture: top chairs → left | white table | right → bottom chairs.
        Explicit gap keeps chairs detached from the tabletop (never absolute-pinned).
      */}
      <View style={styles.furniture}>
        <ChairPills count={chairs.top} axis="horizontal" />

        <View style={styles.midRow}>
          <ChairPills count={chairs.left} axis="vertical" />
          <View style={styles.body}>
            <Typography weight="semibold" size="text-sm" numberOfLines={1}>
              {table.name}
            </Typography>
            {secondary ? (
              <Typography size="text-xs" color="secondary" numberOfLines={1}>
                {secondary}
              </Typography>
            ) : null}
          </View>
          <ChairPills count={chairs.right} axis="vertical" />
        </View>

        <ChairPills count={chairs.bottom} axis="horizontal" />
      </View>
    </Pressable>
  );
}

/** Clear air between chairs and the white tabletop (matches Book-a-Table mock). */
const CHAIR_GAP = 10;

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  tile: {
    maxWidth: "100%",
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "transparent",
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
        true: { borderColor: colors.primary },
        false: {},
      },
    },
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
    backgroundColor: colors.slate5,
  },
  chairV: {
    width: 9,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.slate5,
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    gap: space(0.25),
    paddingHorizontal: space(0.75),
    paddingVertical: space(0.75),
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate4,
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
          borderColor: colors.primary,
          borderWidth: 2,
        },
        false: {},
      },
    },
  },
}));
