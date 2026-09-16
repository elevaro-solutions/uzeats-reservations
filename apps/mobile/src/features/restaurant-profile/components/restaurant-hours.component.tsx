import { useState } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import { formatBookingHours, formatOpeningHoursLines, formatShortHours } from "@reservations/shared";
import type { RestaurantShift } from "@/features/discovery";

export type RestaurantHoursProps = {
  shifts?: RestaurantShift[] | null;
  timeZone?: string | null;
};

export function RestaurantHours({ shifts, timeZone }: RestaurantHoursProps) {
  const { theme } = useUnistyles();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const zone = timeZone ?? undefined;
  const shortHours = formatShortHours(shifts ?? [], zone);
  const bookingHours = formatBookingHours(shifts ?? [], zone);
  const scheduleLines = formatOpeningHoursLines(shifts ?? [], zone);

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
      {bookingHours ? (
        <Typography size="text-sm" color="secondary">
          Reservations: {bookingHours}
        </Typography>
      ) : null}
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
