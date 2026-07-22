import { promotionDiscountCents } from '@reservations/shared';
import { Promotion, type PromotionDocument } from '../models/Marketing.js';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function promotionHasDiscount(promo: PromotionDocument) {
  return (
    (promo.discountPercent != null && promo.discountPercent > 0) ||
    (promo.discountAmountCents != null && promo.discountAmountCents > 0)
  );
}

function hasRedemptionsLeft(promo: PromotionDocument) {
  return !(
    promo.maxRedemptions != null &&
    promo.maxRedemptions > 0 &&
    (promo.redemptions ?? 0) >= promo.maxRedemptions
  );
}

function discountForPromotion(promo: PromotionDocument, depositCents: number) {
  return promotionDiscountCents(depositCents, {
    discountPercent: promo.discountPercent,
    discountAmountCents: promo.discountAmountCents,
  });
}

export function isPromotionValidForSlot(promo: PromotionDocument, slotStart: Date): string | null {
  if (!promo.active) return 'Promotion is not active';
  if (!promotionHasDiscount(promo)) return 'This promotion does not include a deposit discount';
  if (!hasRedemptionsLeft(promo)) return 'This promotion has reached its redemption limit';

  const dateStr = slotStart.toISOString().slice(0, 10);
  if (promo.startDate && dateStr < promo.startDate) {
    return 'Promotion is not valid for this date';
  }
  if (promo.endDate && dateStr > promo.endDate) {
    return 'Promotion has expired';
  }

  const dayOfWeek = slotStart.getDay();
  if (promo.daysOfWeek?.length && !promo.daysOfWeek.includes(dayOfWeek)) {
    return 'Promotion is not valid on this day of the week';
  }

  return null;
}

export async function findValidPromotion(input: {
  restaurantId: string;
  code: string;
  slotStart: Date;
}) {
  const normalized = normalizeCode(input.code);
  if (!normalized) throw new Error('Promotion code is required');

  const candidates = await Promotion.find({
    restaurantId: input.restaurantId,
    active: true,
    code: { $exists: true, $nin: [null, ''] },
  });

  const promo = candidates.find((p) => normalizeCode(p.code ?? '') === normalized);
  if (!promo) throw new Error('Invalid promotion code');

  const slotError = isPromotionValidForSlot(promo, input.slotStart);
  if (slotError) throw new Error(slotError);

  return promo;
}

export async function findBestAutoPromotion(input: {
  restaurantId: string;
  slotStart: Date;
  depositCents: number;
}) {
  if (input.depositCents <= 0) return null;

  const promos = await Promotion.find({
    restaurantId: input.restaurantId,
    active: true,
    $or: [{ code: { $exists: false } }, { code: null }, { code: '' }],
  });

  let best: { promotion: PromotionDocument; discountCents: number } | null = null;
  for (const promo of promos) {
    if (isPromotionValidForSlot(promo, input.slotStart)) continue;
    const discountCents = discountForPromotion(promo, input.depositCents);
    if (discountCents <= 0) continue;
    if (!best || discountCents > best.discountCents) {
      best = { promotion: promo, discountCents };
    }
  }

  return best;
}

export async function resolvePromotionDiscount(input: {
  restaurantId: string;
  code: string;
  slotStart: Date;
  depositCents: number;
}) {
  const promo = await findValidPromotion(input);
  const discountCents = discountForPromotion(promo, input.depositCents);
  if (discountCents <= 0) {
    throw new Error('Deposit is too small for this promotion');
  }
  return { promotion: promo, discountCents };
}

export async function resolvePromotionForBooking(input: {
  restaurantId: string;
  code?: string;
  slotStart: Date;
  depositCents: number;
}) {
  if (input.code?.trim()) {
    return resolvePromotionDiscount({
      restaurantId: input.restaurantId,
      code: input.code,
      slotStart: input.slotStart,
      depositCents: input.depositCents,
    });
  }
  return findBestAutoPromotion(input);
}

export async function recordPromotionRedemption(promotionId: string) {
  await Promotion.findByIdAndUpdate(promotionId, { $inc: { redemptions: 1 } });
}
