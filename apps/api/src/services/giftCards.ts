import crypto from 'node:crypto';
import { GiftCard, type GiftCardDocument } from '../models/GiftCard.js';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function generateGiftCardCode() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `GV-${part()}-${part()}`;
}

function giftCardError(card: GiftCardDocument | null): string | null {
  if (!card) return 'Invalid gift card code';
  if (!card.active) return 'This gift card is inactive';
  if (card.balanceCents <= 0) return 'This gift card has no remaining balance';
  if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
    return 'This gift card has expired';
  }
  return null;
}

export async function issueGiftCard(input: {
  restaurantId: string;
  balanceCents: number;
  issuedByUserId?: string;
  recipientName?: string;
  recipientEmail?: string;
  expiresAt?: Date;
  note?: string;
}) {
  if (input.balanceCents < 1) throw new Error('Gift card balance must be at least $0.01');

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGiftCardCode();
    try {
      return await GiftCard.create({
        restaurantId: input.restaurantId,
        code,
        initialBalanceCents: input.balanceCents,
        balanceCents: input.balanceCents,
        issuedByUserId: input.issuedByUserId,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        expiresAt: input.expiresAt,
        note: input.note ?? '',
      });
    } catch (err: any) {
      if (err?.code === 11000 && attempt < 4) continue;
      throw err;
    }
  }

  throw new Error('Failed to generate a unique gift card code');
}

export async function findValidGiftCard(input: { restaurantId: string; code: string }) {
  const normalized = normalizeCode(input.code);
  if (!normalized) throw new Error('Gift card code is required');

  const card = await GiftCard.findOne({
    restaurantId: input.restaurantId,
    code: normalized,
  });
  const error = giftCardError(card);
  if (error) throw new Error(error);
  return card!;
}

export async function resolveGiftCardDiscount(input: {
  restaurantId: string;
  code: string;
  depositCents: number;
}) {
  const card = await findValidGiftCard(input);
  const discountCents = Math.min(input.depositCents, card.balanceCents);
  if (discountCents <= 0) {
    throw new Error('Deposit is too small to redeem this gift card');
  }
  return { giftCard: card, discountCents };
}

export async function redeemGiftCardBalance(giftCardId: string, amountCents: number) {
  const updated = await GiftCard.findOneAndUpdate(
    { _id: giftCardId, balanceCents: { $gte: amountCents } },
    { $inc: { balanceCents: -amountCents } },
    { new: true },
  );
  if (!updated) throw new Error('Gift card balance is insufficient');
  return updated;
}

export async function setGiftCardActive(giftCardId: string, active: boolean) {
  const card = await GiftCard.findByIdAndUpdate(giftCardId, { active }, { new: true });
  if (!card) throw new Error('Gift card not found');
  return card;
}
