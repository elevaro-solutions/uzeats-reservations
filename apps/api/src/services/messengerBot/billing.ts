import mongoose from 'mongoose';
import { MessengerBotFeeCharge, MessengerLink, Restaurant } from '../../models/index.js';
import { logger } from '../../lib/logger.js';
import {
  getBotPlatformConfig,
  restaurantBotActive,
  restaurantBotChargeCents,
} from './config.js';
import { restaurantTeamUserIds } from './access.js';

export function monthlyPeriodBounds(now = new Date()): {
  billingPeriod: string;
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const billingPeriod = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}`;
  return { billingPeriod, periodStart, periodEnd };
}

/** Creates this month's pending bot charge for every restaurant with the bot active. */
export async function processMessengerBotFeeCharges(now = new Date()): Promise<number> {
  const cfg = await getBotPlatformConfig(true);
  if (!cfg.enabled || !cfg.telegramToken) return 0;
  const { billingPeriod, periodStart, periodEnd } = monthlyPeriodBounds(now);

  const restaurants = await Restaurant.find({
    status: { $in: ['approved'] },
    messengerBotEnabled: true,
  })
    .select('_id name ownerId messengerBotAccess messengerBotEnabled messengerBotFeeCentsOverride')
    .lean();

  let created = 0;
  for (const r of restaurants) {
    if (!restaurantBotActive(cfg, r)) continue;
    const teamIds = await restaurantTeamUserIds(r);
    const linkedAccountCount = await MessengerLink.countDocuments({
      restaurantId: r._id,
      userId: { $in: teamIds },
      isActive: true,
    });
    const amountCents = restaurantBotChargeCents(cfg, r, linkedAccountCount);
    if (amountCents <= 0) continue;

    try {
      await MessengerBotFeeCharge.create({
        restaurantId: r._id,
        billingPeriod,
        periodStart,
        periodEnd,
        amountCents,
        billingMethod: 'MONTHLY_INVOICE',
        status: 'pending',
      });
      created += 1;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue;
      logger.warn({ err, restaurantId: String(r._id) }, '[messenger-bot] fee charge create failed');
    }
  }
  return created;
}

export async function pendingMessengerBotFeeLines(
  restaurantId: unknown,
  billingPeriod: string,
): Promise<Array<{ description: string; quantity: number; unitAmountCents: number; amountCents: number }>> {
  const charges = await MessengerBotFeeCharge.find({
    restaurantId,
    billingPeriod,
    status: 'pending',
    amountCents: { $gt: 0 },
  }).lean();
  return charges.map((c) => ({
    description: `Telegram messenger bot — ${billingPeriod}`,
    quantity: 1,
    unitAmountCents: c.amountCents,
    amountCents: c.amountCents,
  }));
}

export async function markMessengerBotFeesCharged(
  restaurantId: unknown,
  billingPeriod: string,
): Promise<void> {
  await MessengerBotFeeCharge.updateMany(
    {
      restaurantId,
      billingPeriod,
      status: 'pending',
      amountCents: { $gt: 0 },
    },
    { $set: { status: 'charged', billedAt: new Date() } },
  );
}

let feeTimer: ReturnType<typeof setInterval> | null = null;

export function startMessengerBotFeeBillingProcessor(intervalMs = 3_600_000): void {
  if (feeTimer) return;
  const run = () => {
    void processMessengerBotFeeCharges().catch((err) =>
      logger.warn({ err }, '[messenger-bot] fee processor failed'),
    );
  };
  run();
  feeTimer = setInterval(run, intervalMs);
  if (typeof feeTimer === 'object' && 'unref' in feeTimer) feeTimer.unref();
}

export function restaurantOid(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}
