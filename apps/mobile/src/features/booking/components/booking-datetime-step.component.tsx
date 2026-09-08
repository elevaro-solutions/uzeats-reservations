import { Flex } from "@/components";
import { StyleSheet } from "react-native-unistyles";

import type { AvailabilitySlot, BookingShift } from "../types";
import { BookingPartyTooLarge } from "./booking-party-too-large.component";
import { BookingQuickSelectors } from "./booking-quick-selectors.component";
import { BookingSection } from "./booking-section.component";
import { BookingTimeSections } from "./booking-time-sections.component";
import { BookingWaitlistChips } from "./booking-waitlist-chips.component";
import { BookingWaitlistEmpty } from "./booking-waitlist-empty.component";

export type BookingDatetimeStepProps = {
  date: string;
  partySize: number;
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  availabilityLoading: boolean;
  nearbySlots: AvailabilitySlot[];
  availableCount: number;
  waitlistLoading: boolean;
  isOnWaitlist?: boolean;
  shifts?: BookingShift[] | null;
  partyTooLarge?: boolean;
  maxBookablePartySize?: number | null;
  restaurantPhone?: string | null;
  maxAdvanceDays?: number;
  onDateChange: (iso: string) => void;
  onPartySizeChange: (size: number) => void;
  onSelectSlot: (time: string) => void;
  onUnavailablePress: (time: string) => void;
  onJoinWaitlist: () => void;
  onSelectNearbySlot: (time: string) => void;
};

export function BookingDatetimeStep({
  date,
  partySize,
  slots,
  selectedSlot,
  availabilityLoading,
  nearbySlots,
  availableCount,
  waitlistLoading,
  isOnWaitlist = false,
  shifts,
  partyTooLarge = false,
  maxBookablePartySize = null,
  restaurantPhone,
  maxAdvanceDays,
  onDateChange,
  onPartySizeChange,
  onSelectSlot,
  onUnavailablePress,
  onJoinWaitlist,
  onSelectNearbySlot,
}: BookingDatetimeStepProps) {
  const showPartyTooLarge = partyTooLarge && maxBookablePartySize != null;
  const showWaitlist = availableCount === 0 && !partyTooLarge;
  const showWaitlistEmpty =
    showWaitlist && slots.length === 0 && !availabilityLoading;
  const showSecondaryActions =
    !showPartyTooLarge &&
    !showWaitlistEmpty &&
    !availabilityLoading &&
    (nearbySlots.length > 0 || (showWaitlist && slots.length > 0));

  return (
    <Flex gap={3} style={styles.stepContent}>
      <BookingQuickSelectors
        date={date}
        partySize={partySize}
        maxAdvanceDays={maxAdvanceDays}
        onDateChange={onDateChange}
        onPartySizeChange={onPartySizeChange}
      />

      {showPartyTooLarge ? (
        <BookingPartyTooLarge
          maxBookablePartySize={maxBookablePartySize}
          restaurantPhone={restaurantPhone}
        />
      ) : showWaitlistEmpty ? (
        <BookingWaitlistEmpty
          waitlistLoading={waitlistLoading}
          isOnWaitlist={isOnWaitlist}
          onJoinWaitlist={onJoinWaitlist}
        />
      ) : (
        <>
          <BookingTimeSections
            slots={slots}
            selectedSlot={selectedSlot}
            loading={availabilityLoading}
            showEmpty={!availabilityLoading}
            shifts={shifts}
            date={date}
            onSelectSlot={onSelectSlot}
            onUnavailablePress={onUnavailablePress}
          />

          {showSecondaryActions ? (
            <BookingSection>
              <BookingWaitlistChips
                nearbySlots={nearbySlots}
                onSelectSlot={onSelectNearbySlot}
                onJoinWaitlist={onJoinWaitlist}
                waitlistLoading={waitlistLoading}
                showWaitlist={showWaitlist && slots.length > 0}
                isOnWaitlist={isOnWaitlist}
                selectedSlot={selectedSlot}
              />
            </BookingSection>
          ) : null}
        </>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  stepContent: {
    flexGrow: 1,
    paddingBottom: space(2),
  },
}));
