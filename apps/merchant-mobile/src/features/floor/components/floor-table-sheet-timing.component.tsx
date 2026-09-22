import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ClockIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import type { FloorStatusVisual } from "../helpers/floor-status.helpers";
import { formatMinutes } from "../helpers/floor-table-sheet.helpers";

export type FloorTableSheetTimingProps = {
  seatedMinutes?: number | null;
  turnMinutesRemaining?: number | null;
  turnEmphasized: boolean;
  visual: FloorStatusVisual;
};

export function FloorTableSheetTiming({
  seatedMinutes,
  turnMinutesRemaining,
  turnEmphasized,
  visual,
}: FloorTableSheetTimingProps) {
  const { theme } = useUnistyles();
  const showSeatedMetric = seatedMinutes != null;
  const showTurnMetric = turnMinutesRemaining != null;

  if (!showSeatedMetric && !showTurnMetric) return null;

  return (
    <Flex gap={1}>
      <Typography
        size="text-xs"
        weight="semibold"
        color="muted"
        style={styles.sectionTitle}
      >
        Timing
      </Typography>
      <Flex direction="row" gap={1.5}>
        {showSeatedMetric ? (
          <View
            style={[
              styles.metricChip,
              turnEmphasized && styles.metricChipMuted,
            ]}
          >
            <Flex
              direction="row"
              alignItems="center"
              gap={0.5}
              style={styles.metricLabelRow}
            >
              <ClockIcon size={14} color={theme.colors.textMuted} />
              <Typography size="text-xs" color="muted" weight="medium">
                Time seated
              </Typography>
            </Flex>
            <Typography weight="bold" size="text-xl">
              {formatMinutes(seatedMinutes ?? 0)}
            </Typography>
            <Typography size="text-xs" color="muted">
              since check-in
            </Typography>
          </View>
        ) : null}
        {showTurnMetric ? (
          <View
            style={[
              styles.metricChip,
              turnEmphasized && styles.metricChipEmphasis,
            ]}
          >
            <Flex
              direction="row"
              alignItems="center"
              gap={0.5}
              style={styles.metricLabelRow}
            >
              <ClockIcon
                size={14}
                color={
                  turnEmphasized ? visual.accent : theme.colors.textMuted
                }
              />
              <Typography
                size="text-xs"
                weight="medium"
                style={turnEmphasized ? { color: visual.accent } : undefined}
                color={turnEmphasized ? undefined : "muted"}
              >
                Until turn
              </Typography>
            </Flex>
            <Typography
              weight="bold"
              size="text-xl"
              style={turnEmphasized ? { color: visual.accent } : undefined}
            >
              {formatMinutes(turnMinutesRemaining ?? 0)}
            </Typography>
            <Typography
              size="text-xs"
              color={turnEmphasized ? undefined : "muted"}
              style={turnEmphasized ? { color: visual.accent } : undefined}
            >
              {turnEmphasized ? "Table clearing soon" : "of dining window"}
            </Typography>
          </View>
        ) : null}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
  metricChip: {
    flex: 1,
    gap: space(0.5),
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
  },
  metricLabelRow: {
    minWidth: 0,
  },
  metricChipMuted: {
    opacity: 0.85,
  },
  metricChipEmphasis: {
    backgroundColor: colors.infoSubtle,
    borderColor: colors.blue4,
  },
}));
