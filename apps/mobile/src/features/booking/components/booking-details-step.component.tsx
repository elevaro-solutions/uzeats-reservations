import type { Occasion } from "@reservations/shared";
import { StyleSheet } from "react-native-unistyles";

import { Flex, InlineAlert } from "@/components";

import type { DepositBreakdown } from "../helpers/booking-pricing.helpers";
import type {
  BookableExperience,
  BookablePackage,
  BookableTable,
  PrivateDiningSpace,
} from "../types";
import { BookingAddonsSection } from "./booking-addons-section.component";
import { BookingDepositSummary } from "./booking-deposit-summary.component";
import { BookingPreferencesSection } from "./booking-preferences-section.component";
import { BookingPromoRewardsSection } from "./booking-promo-rewards-section.component";
import { BookingSection } from "./booking-section.component";
import { BookingTablePicker } from "./booking-table-picker.component";

export type BookingDetailsStepProps = {
  allowGuestTableSelection: boolean;
  tables: BookableTable[];
  selectedTableId: string | null;
  tablesLoading: boolean;
  onSelectTable: (id: string | null) => void;
  packages: BookablePackage[];
  experiences: BookableExperience[];
  privateSpaces: PrivateDiningSpace[];
  selectedPackageId: string | null;
  selectedExperienceId: string | null;
  selectedPrivateSpaceId: string | null;
  onSelectPackage: (id: string | null) => void;
  onSelectExperience: (id: string | null) => void;
  onSelectPrivateSpace: (id: string | null) => void;
  occasion: Occasion;
  notes: string;
  onOccasionChange: (value: Occasion) => void;
  onNotesChange: (value: string) => void;
  promoCode: string;
  giftCardCode: string;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  platformPoints: number;
  restaurantLoyaltyBalance: number;
  restaurantLoyaltyEnabled: boolean;
  restaurantMinRedeem: number;
  depositBreakdown: DepositBreakdown;
  promoMessage?: string | null;
  promoValid?: boolean;
  giftMessage?: string | null;
  giftValid?: boolean;
  onPromoCodeChange: (value: string) => void;
  onGiftCardCodeChange: (value: string) => void;
  onRedeemPointsChange: (value: number) => void;
  onRedeemRestaurantPointsChange: (value: number) => void;
};

export function BookingDetailsStep({
  allowGuestTableSelection,
  tables,
  selectedTableId,
  tablesLoading,
  onSelectTable,
  packages,
  experiences,
  privateSpaces,
  selectedPackageId,
  selectedExperienceId,
  selectedPrivateSpaceId,
  onSelectPackage,
  onSelectExperience,
  onSelectPrivateSpace,
  occasion,
  notes,
  onOccasionChange,
  onNotesChange,
  promoCode,
  giftCardCode,
  redeemPoints,
  redeemRestaurantPoints,
  platformPoints,
  restaurantLoyaltyBalance,
  restaurantLoyaltyEnabled,
  restaurantMinRedeem,
  depositBreakdown,
  promoMessage,
  promoValid,
  giftMessage,
  giftValid,
  onPromoCodeChange,
  onGiftCardCodeChange,
  onRedeemPointsChange,
  onRedeemRestaurantPointsChange,
}: BookingDetailsStepProps) {
  const showAddons =
    packages.length > 0 || experiences.length > 0 || privateSpaces.length > 0;

  return (
    <Flex gap={4} style={styles.stepContent}>
      {allowGuestTableSelection ? (
        <BookingSection title="Your table">
          <BookingTablePicker
            tables={tables}
            selectedTableId={selectedTableId}
            onSelectTable={onSelectTable}
            loading={tablesLoading}
          />
        </BookingSection>
      ) : (
        <BookingSection title="Your table">
          <InlineAlert
            tone="info"
            message="Your table will be assigned automatically."
          />
        </BookingSection>
      )}

      {showAddons ? (
        <BookingSection title="Add-ons">
          <BookingAddonsSection
            packages={packages}
            experiences={experiences}
            privateSpaces={privateSpaces}
            selectedPackageId={selectedPackageId}
            selectedExperienceId={selectedExperienceId}
            selectedPrivateSpaceId={selectedPrivateSpaceId}
            onSelectPackage={onSelectPackage}
            onSelectExperience={onSelectExperience}
            onSelectPrivateSpace={onSelectPrivateSpace}
          />
        </BookingSection>
      ) : null}

      <BookingPreferencesSection
        occasion={occasion}
        notes={notes}
        onOccasionChange={onOccasionChange}
        onNotesChange={onNotesChange}
      />

      <BookingPromoRewardsSection
        promoCode={promoCode}
        giftCardCode={giftCardCode}
        redeemPoints={redeemPoints}
        redeemRestaurantPoints={redeemRestaurantPoints}
        platformPoints={platformPoints}
        restaurantLoyaltyBalance={restaurantLoyaltyBalance}
        restaurantLoyaltyEnabled={restaurantLoyaltyEnabled}
        restaurantMinRedeem={restaurantMinRedeem}
        grossDepositCents={depositBreakdown.grossCents}
        promoMessage={promoMessage}
        promoValid={promoValid ?? undefined}
        giftMessage={giftMessage}
        giftValid={giftValid ?? undefined}
        onPromoCodeChange={onPromoCodeChange}
        onGiftCardCodeChange={onGiftCardCodeChange}
        onRedeemPointsChange={onRedeemPointsChange}
        onRedeemRestaurantPointsChange={onRedeemRestaurantPointsChange}
      />

      <BookingDepositSummary breakdown={depositBreakdown} />
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  stepContent: {
    flexGrow: 1,
    paddingBottom: space(2),
  },
}));
