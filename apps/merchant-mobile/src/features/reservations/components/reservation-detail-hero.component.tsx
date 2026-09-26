import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  addCalendarDays,
  formatUsDate,
  isoDateInTimeZone,
  PLATFORM_TIMEZONE,
  todayIsoInTimeZone,
} from "@reservations/shared";

import { ArmchairIcon, UsersIcon } from "@/assets";
import { Flex, Typography } from "@/components";
import {
  formatSlotDateTime,
  formatSlotTimeParts,
} from "@/lib/helpers";

import {
  guestDisplayName,
  reservationStatusVisual,
} from "../helpers/reservation-status.helpers";
import {
  reservationOccasionIcon,
  reservationOccasionLabel,
} from "../helpers/reservation-occasion.helpers";

export type ReservationDetailHeroProps = {
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  partySize: number;
  tableLabel: string | null;
  occasion?: string | null;
  timeZone?: string;
};

function formatSlotDayLabel(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dayIso = isoDateInTimeZone(date, timeZone);
  const today = todayIsoInTimeZone(timeZone);
  if (dayIso === today) return "Today";
  if (dayIso === addCalendarDays(today, 1)) return "Tomorrow";
  return formatUsDate(iso, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ReservationDetailHero({
  diner,
  status,
  slotStart,
  slotEnd,
  partySize,
  tableLabel,
  occasion,
  timeZone = PLATFORM_TIMEZONE,
}: ReservationDetailHeroProps) {
  const { theme } = useUnistyles();
  const visual = reservationStatusVisual(status, theme.colors);
  const guestName = guestDisplayName(diner);
  const { time, period } = formatSlotTimeParts(slotStart, timeZone);
  const dayLabel = formatSlotDayLabel(slotStart, timeZone);
  const endTime = slotEnd ? formatSlotDateTime(slotEnd, timeZone) : null;
  const timeRangeLabel = endTime
    ? `${formatSlotDateTime(slotStart, timeZone)} – ${endTime}`
    : null;
  const occasionLabel = reservationOccasionLabel(occasion);
  const occasionKey = occasion?.trim();

  return (
    <Flex gap={1.5} style={styles.hero}>
      <Flex
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
      >
        <Typography
          weight="bold"
          size="display-xs"
          style={styles.name}
          numberOfLines={2}
        >
          {guestName}
        </Typography>
        <View style={[styles.statusPill, { backgroundColor: visual.chipBg }]}>
          <Typography
            weight="semibold"
            size="text-sm"
            style={{ color: visual.chipText }}
            numberOfLines={1}
          >
            {visual.label}
          </Typography>
        </View>
      </Flex>

      <Flex direction="row" alignItems="flex-start" gap={1.5}>
        <View style={styles.timeBlock}>
          <Typography weight="semibold" size="text-xl" numberOfLines={1}>
            {time}
          </Typography>
          <Typography weight="medium" size="text-xs" color="muted">
            {period}
          </Typography>
        </View>

        <Flex flex={1} gap={0.75} style={styles.metaCol}>
          <Flex gap={0.25}>
            {dayLabel ? (
              <Typography weight="semibold" size="text-md" numberOfLines={1}>
                {dayLabel}
              </Typography>
            ) : null}
            {timeRangeLabel ? (
              <Typography size="text-sm" color="muted" numberOfLines={1}>
                {timeRangeLabel}
              </Typography>
            ) : null}
          </Flex>

          <Flex gap={0.5}>
            <Flex
              direction="row"
              alignItems="center"
              gap={1}
              style={styles.metaRow}
            >
              <Flex direction="row" alignItems="center" gap={0.5}>
                <UsersIcon size={14} color={theme.colors.textMuted} />
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {partySize} {partySize === 1 ? "guest" : "guests"}
                </Typography>
              </Flex>
              <Typography size="text-sm" color="muted">
                ·
              </Typography>
              <Flex
                direction="row"
                alignItems="center"
                gap={0.5}
                style={styles.metaShrink}
              >
                <ArmchairIcon size={14} color={theme.colors.textMuted} />
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {tableLabel ? `Table ${tableLabel}` : "Unassigned"}
                </Typography>
              </Flex>
            </Flex>

            {occasionLabel && occasionKey ? (
              <Flex direction="row" alignItems="center" gap={0.5}>
                {reservationOccasionIcon(
                  occasionKey,
                  theme.colors.textMuted,
                  14,
                )}
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {occasionLabel}
                </Typography>
              </Flex>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  hero: {
    paddingBottom: space(0.5),
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.5),
    flexShrink: 0,
  },
  timeBlock: {
    width: space(9),
    height: space(9),
    paddingHorizontal: space(1),
    paddingVertical: space(0.75),
    borderRadius: radius.md,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metaCol: {
    minWidth: 0,
  },
  metaRow: {
    minWidth: 0,
    flexShrink: 1,
  },
  metaShrink: {
    minWidth: 0,
    flexShrink: 1,
  },
}));
