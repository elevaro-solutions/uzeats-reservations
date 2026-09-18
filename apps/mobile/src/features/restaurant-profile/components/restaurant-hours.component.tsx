import { useState } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ChevronDownIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import {
  formatBookingHours,
  formatOpeningHoursLines,
  hoursStatus,
} from "@reservations/shared";
import type { RestaurantShift } from "@/features/discovery";

export type RestaurantHoursProps = {
  shifts?: RestaurantShift[] | null;
  timeZone?: string | null;
};

/** Drop trailing timezone abbreviation already shown in the status header. */
function bookingHoursWithoutTz(value: string): string {
  return value.replace(/\s+[A-Z]{2,5}$/, "").trim();
}

export function RestaurantHours({ shifts, timeZone }: RestaurantHoursProps) {
  const { theme } = useUnistyles();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const zone = timeZone ?? undefined;
  const status = zone ? hoursStatus(shifts ?? [], zone) : null;
  const bookingHoursRaw = formatBookingHours(shifts ?? [], zone);
  const bookingHours = bookingHoursRaw
    ? bookingHoursWithoutTz(bookingHoursRaw)
    : null;
  const scheduleLines = formatOpeningHoursLines(shifts ?? [], zone);
  const canExpand = Boolean(bookingHours) || scheduleLines.length > 0;

  if (!status && !canExpand) {
    return null;
  }

  return (
    <Flex style={styles.hoursBox} gap={1.5}>
      <Pressable
        onPress={() => canExpand && setScheduleOpen((v) => !v)}
        disabled={!canExpand}
        accessibilityRole="button"
        accessibilityLabel="Opening schedule"
        accessibilityState={{ expanded: scheduleOpen }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={styles.headerPressable}
      >
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          {status ? (
            <Typography
              size="text-sm"
              weight="medium"
              color={status.open ? "primary" : "secondary"}
              style={styles.hoursLabel}
            >
              Hours {status.label}
            </Typography>
          ) : (
            <Typography size="text-sm" weight="medium" style={styles.hoursLabel}>
              Hours
            </Typography>
          )}
          {canExpand ? (
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

      {scheduleOpen ? (
        <Flex gap={1}>
          {bookingHours ? (
            <Flex gap={0.25}>
              <Typography size="text-xs" weight="medium" color="muted">
                Reservations
              </Typography>
              <Typography size="text-sm" color="secondary">
                {bookingHours}
              </Typography>
            </Flex>
          ) : null}
          {scheduleLines.map((line) => (
            <Typography key={line} size="text-sm" color="secondary">
              {line}
            </Typography>
          ))}
        </Flex>
      ) : null}
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
    paddingHorizontal: space(1.5),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  headerPressable: {
    justifyContent: "center",
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
}));
