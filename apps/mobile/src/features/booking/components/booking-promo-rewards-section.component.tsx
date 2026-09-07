import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, Flex, Input, Typography } from "@/components";
import { LOYALTY } from "@reservations/shared";

import { formatCents } from "../helpers/booking-pricing.helpers";
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
  finalDepositCents: number;
  promoMessage?: string | null;
  promoValid?: boolean;
  giftMessage?: string | null;
  giftValid?: boolean;
  onPromoCodeChange: (value: string) => void;
  onGiftCardCodeChange: (value: string) => void;
  onRedeemPointsChange: (value: number) => void;
  onRedeemRestaurantPointsChange: (value: number) => void;
};

export function BookingPromoRewardsSection({
  promoCode,
  giftCardCode,
  redeemPoints,
  redeemRestaurantPoints,
  platformPoints,
  restaurantLoyaltyBalance,
  restaurantLoyaltyEnabled,
  restaurantMinRedeem,
  finalDepositCents,
  promoMessage,
  promoValid,
  giftMessage,
  giftValid,
  onPromoCodeChange,
  onGiftCardCodeChange,
  onRedeemPointsChange,
  onRedeemRestaurantPointsChange,
}: BookingPromoRewardsSectionProps) {
  if (finalDepositCents <= 0) return null;

  const canRedeemPlatform = platformPoints >= LOYALTY.MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    restaurantLoyaltyEnabled &&
    restaurantLoyaltyBalance >= restaurantMinRedeem;

  return (
    <BookingSection title="Promo & rewards">
      <Input
        label="Promo code"
        value={promoCode}
        onChangeText={onPromoCodeChange}
        autoCapitalize="characters"
      />
      {promoMessage ? (
        <Typography size="text-xs" color={promoValid ? "primary" : "error"}>
          {promoMessage}
        </Typography>
      ) : null}

      <Input
        label="Gift card"
        value={giftCardCode}
        onChangeText={onGiftCardCodeChange}
        autoCapitalize="characters"
      />
      {giftMessage ? (
        <Typography size="text-xs" color={giftValid ? "primary" : "error"}>
          {giftMessage}
        </Typography>
      ) : null}

      {canRedeemPlatform ? (
        <LoyaltyRow
          label={`Redeem platform points (${platformPoints} available)`}
          value={redeemPoints}
          max={platformPoints}
          step={LOYALTY.MIN_REDEEM_POINTS}
          onChange={onRedeemPointsChange}
        />
      ) : null}

      {canRedeemRestaurant ? (
        <LoyaltyRow
          label={`Redeem restaurant points (${restaurantLoyaltyBalance} available)`}
          value={redeemRestaurantPoints}
          max={restaurantLoyaltyBalance}
          step={restaurantMinRedeem}
          onChange={onRedeemRestaurantPointsChange}
        />
      ) : null}

      <View style={styles.depositRow}>
        <Typography weight="semibold">Deposit due</Typography>
        <Typography weight="bold" size="text-lg">
          {formatCents(finalDepositCents)}
        </Typography>
      </View>
    </BookingSection>
  );
}

function LoyaltyRow({
  label,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const presets = [0, step, step * 2].filter((v) => v <= max);

  return (
    <Flex gap={0.75}>
      <Typography size="text-xs" color="secondary">
        {label}
      </Typography>
      <Flex direction="row" gap={1} flexWrap="wrap">
        {presets.map((preset) => (
          <Chip
            key={preset}
            selected={value === preset}
            onPress={() => onChange(preset)}
          >
            {preset === 0 ? "None" : String(preset)}
          </Chip>
        ))}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  depositRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
  },
}));
