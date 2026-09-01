import { useState } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import { formatShortHours } from "@/features/discovery";
import type { RestaurantShift } from "@/features/discovery";

import { formatOpeningHoursLines } from "../helpers/opening-hours.helpers";

export type RestaurantHoursProps = {
  shifts?: RestaurantShift[] | null;
};

export function RestaurantHours({ shifts }: RestaurantHoursProps) {
  const { theme } = useUnistyles();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const shortHours = formatShortHours(shifts);
  const scheduleLines = formatOpeningHoursLines(shifts ?? []);

  if (!shortHours && scheduleLines.length === 0) {
    return null;
  }

  return (
    <Flex style={styles.hoursBox} gap={1}>
      <Pressable
        onPress={() => scheduleLines.length > 0 && setScheduleOpen((v) => !v)}
        disabled={scheduleLines.length === 0}
        accessibilityRole="button"
        accessibilityLabel="Opening schedule"
      >
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Typography size="text-sm" style={styles.hoursLabel}>
            Hours{shortHours ? `: ${shortHours}` : ""}
          </Typography>
          {scheduleLines.length > 0 ? (
            <Flex
              direction="row"
              alignItems="center"
              gap={0.5}
              style={styles.scheduleCluster}
            >
              <Typography size="text-sm" weight="medium" color="primary">
                Schedule
              </Typography>
              <ChevronDownIcon
                size={16}
                color={theme.colors.primary}
                style={scheduleOpen ? styles.chevronOpen : undefined}
              />
            </Flex>
          ) : null}
        </Flex>
      </Pressable>
      {scheduleOpen
        ? scheduleLines.map((line) => (
            <Typography key={line} size="text-sm" color="secondary">
              {line}
            </Typography>
          ))
        : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  hoursLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  scheduleCluster: {
    flexShrink: 0,
  },
  hoursBox: {
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
}));
