import { useState } from "react";
import {
  LOYALTY,
  pointsToDiscountCents,
  restaurantPointsToDiscountCents,
} from "@reservations/shared";
import { StyleSheet } from "react-native-unistyles";

import { Input, Typography } from "@/components";

import { BookingLoyaltyCard } from "./booking-loyalty-card.component";
import { BookingLoyaltyInfoSheet } from "./booking-loyalty-info-sheet.component";
import { BookingSection } from "./booking-section.component";

export type BookingPromoRewardsSectionProps = {
  promoCode: string;
  giftCardCode: string;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  platformPoints: number;
  restaurantLoyaltyBalance: number;
  restaurantLoyaltyEnabled: boolean;
  restaurantMinRedeem: number;
  grossDepositCents: number;
  promoMessage?: string | null;
  promoValid?: boolean;
  giftMessage?: string | null;
  giftValid?: boolean;
  onPromoCodeChange: (value: string) => void;
  onGiftCardCodeChange: (value: string) => void;
  onRedeemPointsChange: (value: number) => void;
  onRedeemRestaurantPointsChange: (value: number) => void;
};

type InfoSheetTarget = "platform" | "restaurant" | null;

export function BookingPromoRewardsSection({
  promoCode,
  giftCardCode,
  redeemPoints,
  redeemRestaurantPoints,
  platformPoints,
  restaurantLoyaltyBalance,
  restaurantLoyaltyEnabled,
  restaurantMinRedeem,
  grossDepositCents,
  promoMessage,
  promoValid,
  giftMessage,
  giftValid,
  onPromoCodeChange,
  onGiftCardCodeChange,
  onRedeemPointsChange,
  onRedeemRestaurantPointsChange,
}: BookingPromoRewardsSectionProps) {
  const [infoSheet, setInfoSheet] = useState<InfoSheetTarget>(null);

  if (grossDepositCents <= 0) return null;

  // bestPromotion returns valid:false + "No automatic promotion available" when
  // nothing auto-applies — that is informational, not an input error.
  const hasPromoCode = promoCode.trim().length > 0;
  const promoInputError = hasPromoCode && promoValid === false;
  const promoSuccessMessage =
    promoMessage && promoValid === true ? promoMessage : null;
  const promoHelper = promoInputError
    ? (promoMessage ?? undefined)
    : promoSuccessMessage
      ? undefined
      : "Optional. Best available offer applies automatically.";

  const hasGiftCode = giftCardCode.trim().length > 0;
  const giftInputError = hasGiftCode && giftValid === false;
  const giftSuccessMessage =
    giftMessage && giftValid === true ? giftMessage : null;
  const giftHelper = giftInputError
    ? (giftMessage ?? undefined)
    : giftSuccessMessage
      ? undefined
      : "Optional. Balance applies to this deposit.";

  return (
    <BookingSection title="Promo & rewards">
      <Input
        label="Promo code"
        value={promoCode}
        onChangeText={onPromoCodeChange}
        autoCapitalize="characters"
        placeholder="Enter code"
        helperText={promoHelper}
        error={promoInputError}
      />
      {promoSuccessMessage ? (
        <Typography size="text-xs" color="primary">
          {promoSuccessMessage}
        </Typography>
      ) : null}

      <Input
        label="Gift card"
        value={giftCardCode}
        onChangeText={onGiftCardCodeChange}
        autoCapitalize="characters"
        placeholder="Enter gift card code"
        helperText={giftHelper}
        error={giftInputError}
      />
      {giftSuccessMessage ? (
        <Typography size="text-xs" color="primary">
          {giftSuccessMessage}
        </Typography>
      ) : null}

      <BookingLoyaltyCard
        title="Tablevera points"
        variant="platform"
        balance={platformPoints}
        minRedeem={LOYALTY.MIN_REDEEM_POINTS}
        value={redeemPoints}
        depositHeadroomCents={grossDepositCents}
        discountCentsFor={pointsToDiscountCents}
        onChange={onRedeemPointsChange}
        onHowItWorks={() => setInfoSheet("platform")}
        style={styles.pointsCard}
      />

      {restaurantLoyaltyEnabled ? (
        <BookingLoyaltyCard
          title="Restaurant points"
          variant="restaurant"
          balance={restaurantLoyaltyBalance}
          minRedeem={restaurantMinRedeem}
          value={redeemRestaurantPoints}
          depositHeadroomCents={Math.max(
            0,
            grossDepositCents - pointsToDiscountCents(redeemPoints),
          )}
          discountCentsFor={restaurantPointsToDiscountCents}
          onChange={onRedeemRestaurantPointsChange}
          onHowItWorks={() => setInfoSheet("restaurant")}
        />
      ) : null}

      <BookingLoyaltyInfoSheet
        visible={infoSheet != null}
        onClose={() => setInfoSheet(null)}
        variant={infoSheet ?? "platform"}
        minRedeem={
          infoSheet === "restaurant"
            ? restaurantMinRedeem
            : LOYALTY.MIN_REDEEM_POINTS
        }
      />
    </BookingSection>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  pointsCard: {
    marginTop: space(1),
  },
}));
