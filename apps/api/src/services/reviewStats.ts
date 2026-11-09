import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';

/** Public rating and count ignore hidden reviews. */
export async function recomputePublicReviewStats(
  restaurantId: mongoose.Types.ObjectId | string,
): Promise<void> {
  const id =
    restaurantId instanceof mongoose.Types.ObjectId
      ? restaurantId
      : new mongoose.Types.ObjectId(restaurantId);

  const stats = await Review.aggregate([
    { $match: { restaurantId: id, hidden: { $ne: true } } },
    {
      $group: {
        _id: '$restaurantId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats[0]) {
    await Restaurant.findByIdAndUpdate(id, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
    return;
  }

  await Restaurant.findByIdAndUpdate(id, {
    averageRating: 0,
    reviewCount: 0,
  });
}

/**
 * Seed / import data stored listing-site counts (e.g. 96) that search cards still showed.
 * Align every restaurant with its published reviews; only differing rows are written.
 */
export async function syncAllPublicReviewStats(): Promise<number> {
  const stats = await Review.aggregate<{ _id: mongoose.Types.ObjectId; avg: number; count: number }>([
    { $match: { hidden: { $ne: true } } },
    { $group: { _id: '$restaurantId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const byId = new Map(stats.map((s) => [s._id.toString(), s]));
  const restaurants = await Restaurant.find({})
    .select('_id averageRating reviewCount')
    .lean();

  const ops = [];
  for (const r of restaurants) {
    const s = byId.get(r._id.toString());
    const averageRating = s ? Math.round(s.avg * 10) / 10 : 0;
    const reviewCount = s?.count ?? 0;
    if ((r.averageRating ?? 0) === averageRating && (r.reviewCount ?? 0) === reviewCount) continue;
    ops.push({
      updateOne: { filter: { _id: r._id }, update: { $set: { averageRating, reviewCount } } },
    });
  }
  if (ops.length) await Restaurant.bulkWrite(ops);
  return ops.length;
}
