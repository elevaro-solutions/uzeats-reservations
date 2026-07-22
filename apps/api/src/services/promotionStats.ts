import mongoose from 'mongoose';
import { Promotion } from '../models/Marketing.js';
import { Reservation } from '../models/Reservation.js';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fillDaySeries(
  since: Date,
  days: number,
  byDay: Map<string, { count: number; discountCents: number }>,
) {
  const series: { date: string; count: number; discountCents: number }[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = dateKey(cursor);
    const row = byDay.get(key) ?? { count: 0, discountCents: 0 };
    series.push({ date: key, count: row.count, discountCents: row.discountCents });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

export async function getPromotionStats(restaurantId: string, days = 30) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

  const [totalsAgg, byDayAgg, byPromoAgg, promotions] = await Promise.all([
    Reservation.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          promotionId: { $ne: null },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          redemptions: { $sum: 1 },
          discountCents: { $sum: '$promoDiscountCents' },
        },
      },
    ]),
    Reservation.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          promotionId: { $ne: null },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          discountCents: { $sum: '$promoDiscountCents' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Reservation.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          promotionId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$promotionId',
          redemptions: { $sum: 1 },
          discountCents: { $sum: '$promoDiscountCents' },
        },
      },
      { $sort: { redemptions: -1 } },
    ]),
    Promotion.find({ restaurantId }).select(
      'title code discountPercent discountAmountCents redemptions maxRedemptions active',
    ),
  ]);

  const byDay = new Map<string, { count: number; discountCents: number }>();
  for (const row of byDayAgg) {
    byDay.set(row._id, { count: row.count, discountCents: row.discountCents });
  }

  const promoById = new Map(promotions.map((p) => [p._id.toString(), p]));

  return {
    days,
    totalRedemptions: totalsAgg[0]?.redemptions ?? 0,
    totalDiscountCents: totalsAgg[0]?.discountCents ?? 0,
    redemptionsByDay: fillDaySeries(since, days, byDay),
    promotions: byPromoAgg.map((row) => {
      const promo = promoById.get(row._id.toString());
      return {
        promotionId: row._id.toString(),
        title: promo?.title ?? 'Deleted promotion',
        code: promo?.code ?? null,
        redemptions: row.redemptions,
        discountCents: row.discountCents,
        active: promo?.active ?? false,
      };
    }),
    activePromotionCount: promotions.filter((p) => p.active).length,
  };
}
