import {
  LOYALTY,
  pointsToDiscountCents,
  RESTAURANT_LOYALTY,
  restaurantPointsToDiscountCents,
} from "@reservations/shared";

import type {
  BookableExperience,
  BookablePackage,
  BookableTable,
  PrivateDiningSpace,
  PromotionValidation,
  RestaurantBookingInfo,
} from "../types";

type PricingInput = {
  restaurant: RestaurantBookingInfo;
  partySize: number;
  selectedTable?: BookableTable | null;
  selectedPackage?: BookablePackage | null;
  selectedPrivateSpace?: PrivateDiningSpace | null;
  selectedExperience?: BookableExperience | null;
  redeemPoints: number;
  redeemRestaurantPoints: number;
  restaurantLoyaltyBalance: number;
  activePromo?: PromotionValidation | null;
  giftValidation?: PromotionValidation | null;
};

export function computeGrossDepositCents(input: PricingInput): number {
  const { restaurant, partySize } = input;
  const baseDeposit = restaurant.depositRequired
    ? restaurant.depositAmountCents * partySize
    : 0;

  const packagePrice = input.selectedPackage
    ? input.selectedPackage.pricePerGuest
      ? input.selectedPackage.priceCents * partySize
      : input.selectedPackage.priceCents
    : 0;

  const privateSpacePrice = input.selectedPrivateSpace?.rentalFeeCents ?? 0;
  const experiencePrice = input.selectedExperience?.ticketPriceCents ?? 0;

  return baseDeposit + packagePrice + privateSpacePrice + experiencePrice;
}

export function computeDepositBeforePromo(input: PricingInput): number {
  const gross = computeGrossDepositCents(input);
  let deposit = gross;

  if (input.redeemPoints >= LOYALTY.MIN_REDEEM_POINTS) {
    deposit -= pointsToDiscountCents(input.redeemPoints);
  }

  const restaurantMinRedeem =
    input.restaurant.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    input.restaurant.loyaltyEnabled &&
    input.restaurantLoyaltyBalance >= restaurantMinRedeem &&
    gross > 0;

  if (
    canRedeemRestaurant &&
    input.redeemRestaurantPoints >= restaurantMinRedeem
  ) {
    deposit -= restaurantPointsToDiscountCents(input.redeemRestaurantPoints);
  }

  return Math.max(0, deposit);
}

export function computeFinalDepositCents(input: PricingInput): number {
  const beforePromo = computeDepositBeforePromo(input);
  const promoDiscount = input.activePromo?.valid
    ? input.activePromo.discountCents
    : 0;
  const afterPromo = Math.max(0, beforePromo - promoDiscount);
  const giftDiscount = input.giftValidation?.valid
    ? input.giftValidation.discountCents
    : 0;
  return Math.max(0, afterPromo - giftDiscount);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
