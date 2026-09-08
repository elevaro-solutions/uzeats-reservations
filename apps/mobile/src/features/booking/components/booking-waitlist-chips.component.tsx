import { Pressable, View, useWindowDimensions } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";

import { slotTimesEqual } from "../helpers/booking-validation.helpers";
import { formatSlotTime } from "../helpers/time-slots.helpers";
import type { AvailabilitySlot } from "../types";

const GRID_COLUMNS = 3;

export type BookingWaitlistChipsProps = {
  nearbySlots: AvailabilitySlot[];
  onSelectSlot: (time: string) => void;
  onJoinWaitlist: () => void;
  waitlistLoading?: boolean;
  showWaitlist?: boolean;
  isOnWaitlist?: boolean;
  selectedSlot?: string | null;
};

export function BookingWaitlistChips({
  nearbySlots,
  onSelectSlot,
  onJoinWaitlist,
  waitlistLoading = false,
  showWaitlist = false,
  isOnWaitlist = false,
  selectedSlot = null,
}: BookingWaitlistChipsProps) {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();

  const showNearby = nearbySlots.length > 0;
  const showJoin = !showNearby && showWaitlist && !isOnWaitlist;
  const showJoined = !showNearby && showWaitlist && isOnWaitlist;

  if (!showNearby && !showJoin && !showJoined) return null;

  const sectionPadding = theme.space(2) * 2;
  const gap = theme.space(1);
  const chipWidth =
    (screenWidth - sectionPadding - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  if (showNearby) {
    return (
      <Flex gap={1.25}>
        <Flex gap={0.5}>
          <Typography size="text-sm" weight="semibold">
            Try a nearby time
          </Typography>
          <Typography size="text-xs" color="secondary">
            Your pick is taken — these are still open.
          </Typography>
        </Flex>
        <Flex direction="row" gap={1} flexWrap="wrap">
          {nearbySlots.map((slot) => {
            const selected =
              selectedSlot != null && slotTimesEqual(selectedSlot, slot.time);
            return (
              <Pressable
                key={slot.time}
                onPress={() => onSelectSlot(slot.time)}
                style={[
                  styles.timeChip,
                  { width: chipWidth },
                  selected && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${formatSlotTime(slot.time)}`}
              >
                <Typography
                  weight={selected ? "semibold" : "medium"}
                  size="text-sm"
                  color={selected ? "inverse" : "primary"}
                >
                  {formatSlotTime(slot.time)}
                </Typography>
              </Pressable>
            );
          })}
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex alignItems="center" gap={1.5} style={styles.waitlistBlock}>
      <Typography size="text-sm" color="secondary" style={styles.centered}>
        All times are taken for this date.
      </Typography>

      {showJoin ? (
        <Button
          size="md"
          variant="filled"
          color="secondary"
          loading={waitlistLoading}
          onPress={onJoinWaitlist}
        >
          Join waitlist
        </Button>
      ) : null}

      {showJoined ? (
        <View style={styles.statusPill}>
          <CheckIcon size={14} color={theme.colors.success} />
          <Typography size="text-xs" weight="semibold" color="success">
            Joined for this date
          </Typography>
        </View>
      ) : null}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  timeChip: {
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    minHeight: space(5.5),
  },
  waitlistBlock: {
    width: "100%",
    paddingVertical: space(0.5),
  },
  centered: {
    textAlign: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.full,
    backgroundColor: colors.successSubtle,
  },
}));
