import { Pressable, View, useWindowDimensions } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, InlineAlert, Loader, Typography } from "@/components";

import {
  formatSlotTime,
  groupSlotsByTimeOfDay,
} from "../helpers/time-slots.helpers";
import type { AvailabilitySlot } from "../types";

const GROUP_LABELS = {
  morning: "Morning",
  day: "Day",
  evening: "Evening",
} as const;

const GRID_COLUMNS = 3;

export type BookingTimeSectionsProps = {
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  onUnavailablePress?: (time: string) => void;
  loading?: boolean;
  showEmpty?: boolean;
};

export function BookingTimeSections({
  slots,
  selectedSlot,
  onSelectSlot,
  onUnavailablePress,
  loading = false,
  showEmpty = false,
}: BookingTimeSectionsProps) {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();
  const grouped = groupSlotsByTimeOfDay(slots);

  const horizontalPadding = theme.space(2) * 2;
  const gap = theme.space(1);
  const chipWidth =
    (screenWidth - horizontalPadding - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const hasVisibleGroups = (
    Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>
  ).some((group) => grouped[group].length > 0);

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
        ) : showEmpty && !hasVisibleGroups ? (
          <InlineAlert
            tone="info"
            message="No times available for this date — try another day or join the waitlist."
          />
        ) : (
          <Flex gap={2.5}>
            {(
              Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>
            ).map((group) => {
              const groupSlots = grouped[group];
              if (groupSlots.length === 0) return null;

              return (
                <View key={group}>
                  <Typography
                    weight="medium"
                    size="text-xs"
                    color="secondary"
                    style={styles.groupTitle}
                  >
                    {GROUP_LABELS[group]}
                  </Typography>
                  <Flex direction="row" gap={1} flexWrap="wrap">
                    {groupSlots.map((slot) => (
                      <TimeSlotChip
                        key={slot.time}
                        slot={slot}
                        selected={selectedSlot === slot.time}
                        width={chipWidth}
                        onSelect={onSelectSlot}
                        onUnavailablePress={onUnavailablePress}
                      />
                    ))}
                  </Flex>
                </View>
              );
            })}
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
