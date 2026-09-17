import { StyleSheet } from "react-native-unistyles";

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

export function RestaurantHours({ shifts, timeZone }: RestaurantHoursProps) {
  const zone = timeZone ?? undefined;
  const status = zone ? hoursStatus(shifts ?? [], zone) : null;
  const bookingHours = formatBookingHours(shifts ?? [], zone);
  const scheduleLines = formatOpeningHoursLines(shifts ?? [], zone);

  if (!status && scheduleLines.length === 0 && !bookingHours) {
    return null;
  }

  return (
    <Flex style={styles.hoursBox} gap={1}>
      {status ? (
        <Typography
          size="text-sm"
          weight="medium"
          color={status.open ? "primary" : "secondary"}
        >
          Hours {status.label}
        </Typography>
      ) : null}
      {scheduleLines.map((line) => (
        <Typography key={line} size="text-sm" color="secondary">
          {line}
        </Typography>
      ))}
      {bookingHours ? (
        <Typography size="text-sm" color="secondary">
          Reservations: {bookingHours}
        </Typography>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  hoursBox: {
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
}));
