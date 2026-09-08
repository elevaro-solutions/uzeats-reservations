import { Pressable, View, useWindowDimensions } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, Loader, Typography } from "@/components";

import { slotTimesEqual } from "../helpers/booking-validation.helpers";
import {
  formatSlotTime,
  groupSlotsByShift,
} from "../helpers/time-slots.helpers";
import type { AvailabilitySlot, BookingShift } from "../types";

const GRID_COLUMNS = 3;

export type BookingTimeSectionsProps = {
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  onUnavailablePress?: (time: string) => void;
  loading?: boolean;
  showEmpty?: boolean;
  /** When provided, sections use real shift names (Lunch / Dinner). */
  shifts?: BookingShift[] | null;
  /** YYYY-MM-DD — required with shifts for day-of-week matching. */
  date?: string;
};

export function BookingTimeSections({
  slots,
  selectedSlot,
  onSelectSlot,
  onUnavailablePress,
  loading = false,
  showEmpty = false,
  shifts,
  date,
}: BookingTimeSectionsProps) {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();

  const groups = groupSlotsByShift(
    slots,
    shifts ?? [],
    date ?? new Date().toISOString().slice(0, 10),
  );

  const horizontalPadding = theme.space(2) * 2;
  const gap = theme.space(1);
  const chipWidth =
    (screenWidth - horizontalPadding - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const hasVisibleGroups = groups.length > 0;

  return (
    <Flex gap={1.5} style={styles.wrapper}>
      <Typography weight="semibold" size="text-lg">
        Select time
      </Typography>
      <View style={styles.content}>
        {loading ? (
          <Flex
            alignItems="center"
            justifyContent="center"
            style={styles.loaderWrap}
          >
            <Loader />
          </Flex>
        ) : showEmpty && !hasVisibleGroups ? null : (
          <Flex gap={2.5}>
            {groups.map((group) => (
              <View key={group.id}>
                <Typography
                  weight="medium"
                  size="text-xs"
                  color="secondary"
                  style={styles.groupTitle}
                >
                  {group.name}
                </Typography>
                <Flex direction="row" gap={1} flexWrap="wrap">
                  {group.slots.map((slot) => (
                    <TimeSlotChip
                      key={slot.time}
                      slot={slot}
                      selected={
                        selectedSlot != null &&
                        slotTimesEqual(selectedSlot, slot.time)
                      }
                      width={chipWidth}
                      onSelect={onSelectSlot}
                      onUnavailablePress={onUnavailablePress}
                    />
                  ))}
                </Flex>
              </View>
            ))}
          </Flex>
        )}
      </View>
    </Flex>
  );
}

function TimeSlotChip({
  slot,
  selected,
  width,
  onSelect,
  onUnavailablePress,
}: {
  slot: AvailabilitySlot;
  selected: boolean;
  width: number;
  onSelect: (time: string) => void;
  onUnavailablePress?: (time: string) => void;
}) {
  const { theme } = useUnistyles();
  const label = formatSlotTime(slot.time);
  const fewLeft =
    slot.available && slot.remainingTables > 0 && slot.remainingTables <= 2;

  function onPress() {
    if (slot.available) {
      onSelect(slot.time);
      return;
    }
    onUnavailablePress?.(slot.time);
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!slot.available && !onUnavailablePress}
      style={[
        styles.chip,
        { width },
        selected && {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },
        !slot.available && styles.chipDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !slot.available }}
    >
      <Typography
        weight={selected ? "semibold" : "medium"}
        size="text-sm"
        color={selected ? "inverse" : slot.available ? "primary" : "muted"}
      >
        {label}
      </Typography>
      {fewLeft ? (
        <Typography size="text-xs" color={selected ? "inverse" : "muted"}>
          {slot.remainingTables} left
        </Typography>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrapper: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  content: {
    minHeight: space(16),
  },
  loaderWrap: {
    minHeight: space(16),
  },
  groupTitle: {
    marginBottom: space(1.25),
  },
  chip: {
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    minHeight: space(5.5),
  },
  chipDisabled: {
    opacity: 0.4,
    backgroundColor: colors.slate2,
  },
}));
