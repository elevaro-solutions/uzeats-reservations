import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Chip, Flex, RemoteImage, Typography } from "@/components";

import { formatSlotTime } from "../helpers/time-slots.helpers";
import type { AvailabilitySlot } from "../types";

export type BookingWaitlistChipsProps = {
  nearbySlots: AvailabilitySlot[];
  onSelectSlot: (time: string) => void;
  onJoinWaitlist: () => void;
  waitlistLoading?: boolean;
  showWaitlist?: boolean;
};

export function BookingWaitlistChips({
  nearbySlots,
  onSelectSlot,
  onJoinWaitlist,
  waitlistLoading = false,
  showWaitlist = false,
}: BookingWaitlistChipsProps) {
  if (nearbySlots.length === 0 && !showWaitlist) return null;

  return (
    <View style={styles.wrapper}>
      {nearbySlots.length > 0 ? (
        <Flex gap={1}>
          <Typography size="text-sm" color="secondary">
            Nearby available times
          </Typography>
          <Flex direction="row" gap={1} flexWrap="wrap">
            {nearbySlots.map((slot) => (
              <Chip key={slot.time} onPress={() => onSelectSlot(slot.time)}>
                {formatSlotTime(slot.time)}
              </Chip>
            ))}
          </Flex>
        </Flex>
      ) : null}

      {showWaitlist ? (
        <Pressable
          onPress={onJoinWaitlist}
          disabled={waitlistLoading}
          style={styles.waitlistBtn}
        >
          <Typography weight="semibold" color="primary">
            {waitlistLoading ? "Joining waitlist…" : "Join waitlist for this date"}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrapper: {
    gap: space(1.5),
  },
  waitlistBtn: {
    padding: space(1.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.slate2,
    alignItems: "center",
  },
}));
