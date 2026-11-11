import {
  isoDateInTimeZone,
  promotionDiscountCents,
  restaurantTimeZone,
  weekdayInTimeZone,
} from '@reservations/shared';
import { Promotion, type PromotionDocument } from '../models/Marketing.js';
import { Restaurant } from '../models/Restaurant.js';
import { ValidationError } from '../lib/errors.js';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/** Another promotion at this restaurant already using `code` (case-insensitive), if any. */
export async function findPromotionCodeConflict(input: {
  restaurantId: string;
  code: string;
  excludeId?: string;
}) {
  const normalized = normalizeCode(input.code);
  if (!normalized) return null;
  const candidates = await Promotion.find({
    restaurantId: input.restaurantId,
    code: { $exists: true, $nin: [null, ''] },
    ...(input.excludeId ? { _id: { $ne: input.excludeId } } : {}),
  }).select('code title');
  return candidates.find((p) => normalizeCode(p.code ?? '') === normalized) ?? null;
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

export function isPromotionValidForSlot(
  promo: PromotionDocument,
  slotStart: Date,
  timeZone: string,
): string | null {
  if (!promo.active) return 'Promotion is not active';
  if (!promotionHasDiscount(promo)) return 'This promotion does not include a deposit discount';
  if (!hasRedemptionsLeft(promo)) return 'This promotion has reached its redemption limit';
  return promotionDateRestrictionError(promo, slotStart, timeZone);
}

/**
 * Date-range and weekday limits only. Used when an already-redeemed booking moves to a new
 * slot, where the active flag and redemption count must not be re-checked.
 */
export function promotionDateRestrictionError(
  promo: Pick<PromotionDocument, 'startDate' | 'endDate' | 'daysOfWeek'>,
  slotStart: Date,
  timeZone: string,
): string | null {
  const dateStr = isoDateInTimeZone(slotStart, timeZone);
  if (promo.startDate && dateStr < promo.startDate) {
    return 'Promotion is not valid for this date';
  }
  if (promo.endDate && dateStr > promo.endDate) {
    return 'Promotion has expired';
  }

  const dayOfWeek = weekdayInTimeZone(slotStart, timeZone);
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
  if (!normalized) throw new ValidationError('Promotion code is required');

  // Newest first: if legacy duplicates share a code, the owner's latest edit (e.g. day limits) wins.
  const candidates = await Promotion.find({
    restaurantId: input.restaurantId,
    active: true,
    code: { $exists: true, $nin: [null, ''] },
  }).sort({ updatedAt: -1 });

  const promo = candidates.find((p) => normalizeCode(p.code ?? '') === normalized);
  if (!promo) throw new ValidationError('Invalid promotion code');

  const restaurant = await Restaurant.findById(input.restaurantId).select('address location').lean();
  const timeZone = restaurantTimeZone(restaurant ?? {});
  const slotError = isPromotionValidForSlot(promo, input.slotStart, timeZone);
  if (slotError) throw new ValidationError(slotError);

  return promo;
}

export async function findBestAutoPromotion(input: {
  restaurantId: string;
  slotStart: Date;
  depositCents: number;
}) {
  if (input.depositCents <= 0) return null;

  const restaurant = await Restaurant.findById(input.restaurantId).select('address location').lean();
  const timeZone = restaurantTimeZone(restaurant ?? {});

  const promos = await Promotion.find({
    restaurantId: input.restaurantId,
    active: true,
    $or: [{ code: { $exists: false } }, { code: null }, { code: '' }],
  });

  let best: { promotion: PromotionDocument; discountCents: number } | null = null;
  for (const promo of promos) {
    if (isPromotionValidForSlot(promo, input.slotStart, timeZone)) continue;
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
    throw new ValidationError('Deposit is too small for this promotion');
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

export async function unrecordPromotionRedemption(promotionId: string) {
  await Promotion.findByIdAndUpdate(promotionId, { $inc: { redemptions: -1 } });
}
