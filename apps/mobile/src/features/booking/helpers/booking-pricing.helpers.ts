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
  // Server charges ticketPriceCents × partySize (see reservations.ts)
  const experiencePrice = input.selectedExperience
    ? input.selectedExperience.ticketPriceCents * partySize
    : 0;

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
  return computeDepositBreakdown(input).dueCents;
}

export type DepositBreakdown = {
  baseDepositCents: number;
  addOnsCents: number;
  grossCents: number;
  platformPointsDiscountCents: number;
  restaurantPointsDiscountCents: number;
  pointsDiscountCents: number;
  promoDiscountCents: number;
  giftDiscountCents: number;
  dueCents: number;
};

export function computeDepositBreakdown(input: PricingInput): DepositBreakdown {
  const { restaurant, partySize } = input;
  const baseDepositCents = restaurant.depositRequired
    ? restaurant.depositAmountCents * partySize
    : 0;

  const grossCents = computeGrossDepositCents(input);
  const addOnsCents = Math.max(0, grossCents - baseDepositCents);

  let remaining = grossCents;
  let platformPointsDiscountCents = 0;
  if (input.redeemPoints >= LOYALTY.MIN_REDEEM_POINTS) {
    platformPointsDiscountCents = Math.min(
      remaining,
      pointsToDiscountCents(input.redeemPoints),
    );
    remaining -= platformPointsDiscountCents;
  }

  const restaurantMinRedeem =
    input.restaurant.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const canRedeemRestaurant =
    input.restaurant.loyaltyEnabled &&
    input.restaurantLoyaltyBalance >= restaurantMinRedeem &&
    grossCents > 0;

  let restaurantPointsDiscountCents = 0;
  if (
    canRedeemRestaurant &&
    input.redeemRestaurantPoints >= restaurantMinRedeem
  ) {
    restaurantPointsDiscountCents = Math.min(
      remaining,
      restaurantPointsToDiscountCents(input.redeemRestaurantPoints),
    );
    remaining -= restaurantPointsDiscountCents;
  }

  const promoDiscountCents = input.activePromo?.valid
    ? Math.min(remaining, input.activePromo.discountCents)
    : 0;
  remaining -= promoDiscountCents;

  const giftDiscountCents = input.giftValidation?.valid
    ? Math.min(remaining, input.giftValidation.discountCents)
    : 0;
  remaining -= giftDiscountCents;

  return {
    baseDepositCents,
    addOnsCents,
    grossCents,
    platformPointsDiscountCents,
    restaurantPointsDiscountCents,
    pointsDiscountCents:
      platformPointsDiscountCents + restaurantPointsDiscountCents,
    promoDiscountCents,
    giftDiscountCents,
    dueCents: Math.max(0, remaining),
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
