import { pointsToDiscountCents } from '@reservations/shared';

const BUILTIN_TIER_IDS = new Set(['bronze', 'silver', 'gold']);

/** Tier accent modifier class; admin-defined tiers fall back to brand colors. */
export function loyaltyTierClass(tierId: string | null | undefined): string {
  const id = (tierId ?? '').toLowerCase();
  return `rt-loyalty-tier--${BUILTIN_TIER_IDS.has(id) ? id : 'custom'}`;
}

export function formatPoints(points: number): string {
  return Math.round(points).toLocaleString('en-US');
}

export function formatMultiplier(multiplier: number): string {
  return `${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(2).replace(/0$/, '')}x`;
}

export function formatPointsValue(points: number, redeemPointsPerDollar: number): string {
  const cents = pointsToDiscountCents(Math.max(0, points), redeemPointsPerDollar);
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
