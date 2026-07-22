export type PromotionDiscountOptions = {
  discountPercent?: number | null;
  discountAmountCents?: number | null;
};

/** Deposit discount from a percentage and/or fixed-amount promotion. */
export function promotionDiscountCents(
  depositCents: number,
  options: PromotionDiscountOptions | number,
): number {
  if (depositCents <= 0) return 0;

  const normalized: PromotionDiscountOptions =
    typeof options === 'number' ? { discountPercent: options } : options;

  const fixed = normalized.discountAmountCents ?? 0;
  if (fixed > 0) {
    return Math.min(depositCents, fixed);
  }

  const percent = normalized.discountPercent ?? 0;
  if (percent <= 0) return 0;
  return Math.min(depositCents, Math.floor((depositCents * percent) / 100));
}
