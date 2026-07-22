import { LOYALTY } from './constants.js';

/** Defaults for per-restaurant loyalty programs (separate from platform Tablevera points). */
export const RESTAURANT_LOYALTY = {
  DEFAULT_POINTS_PER_VISIT: 50,
  DEFAULT_MIN_REDEEM_POINTS: 200,
  REDEEM_POINTS_PER_DOLLAR: LOYALTY.REDEEM_POINTS_PER_DOLLAR,
} as const;

export function restaurantPointsToDiscountCents(points: number): number {
  return Math.floor((points / RESTAURANT_LOYALTY.REDEEM_POINTS_PER_DOLLAR) * 100);
}

export function maxRestaurantRedeemPointsForDeposit(depositCents: number): number {
  return Math.floor(depositCents / 100) * RESTAURANT_LOYALTY.REDEEM_POINTS_PER_DOLLAR;
}

export interface RestaurantRedeemResolution {
  pointsToRedeem: number;
  discountCents: number;
}

export function resolveRestaurantRedeemPoints(
  redeemPoints: number | undefined,
  depositCents: number,
  balance: number,
  minRedeem: number,
): RestaurantRedeemResolution | null {
  if (!redeemPoints || redeemPoints === 0) return null;

  if (redeemPoints < minRedeem) {
    throw new Error(`Minimum redeem is ${minRedeem} restaurant points`);
  }
  if (depositCents <= 0) {
    throw new Error('Restaurant points can only be redeemed against a deposit');
  }
  if (redeemPoints > balance) {
    throw new Error('Insufficient restaurant loyalty points');
  }

  const maxPoints = maxRestaurantRedeemPointsForDeposit(depositCents);
  const pointsToRedeem = Math.min(redeemPoints, maxPoints);
  if (pointsToRedeem < minRedeem) {
    throw new Error(
      `Deposit is too small to redeem ${minRedeem} points (max ${maxPoints} for this booking)`,
    );
  }

  return {
    pointsToRedeem,
    discountCents: restaurantPointsToDiscountCents(pointsToRedeem),
  };
}
