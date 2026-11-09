import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { syncAllPublicReviewStats } from '../services/reviewStats.js';

async function restaurant(slug: string, reviewCount: number, averageRating: number) {
  return Restaurant.create({
    name: slug,
    slug,
    cuisine: 'Uzbek',
    priceRange: 2,
    status: 'approved',
    ownerId: new mongoose.Types.ObjectId(),
    address: { line1: '1 Test', city: 'Brooklyn', state: 'NY', zip: '11201' },
    location: { type: 'Point', coordinates: [-73.99, 40.69] },
    reviewCount,
    averageRating,
  });
}

describe('syncAllPublicReviewStats', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('replaces seeded listing counts with published review totals', async () => {
    const withReview = await restaurant('tashkent-house', 96, 4.5);
    const withoutReviews = await restaurant('empty-house', 40, 4.2);
    await Review.collection.insertMany([
      {
        restaurantId: withReview._id,
        reservationId: new mongoose.Types.ObjectId(),
        dinerId: new mongoose.Types.ObjectId(),
        rating: 4,
        hidden: false,
      },
      {
        restaurantId: withReview._id,
        reservationId: new mongoose.Types.ObjectId(),
        dinerId: new mongoose.Types.ObjectId(),
        rating: 2,
        hidden: true,
      },
    ]);

    expect(await syncAllPublicReviewStats()).toBe(2);
    const a = await Restaurant.findById(withReview._id).lean();
    const b = await Restaurant.findById(withoutReviews._id).lean();
    expect([a!.reviewCount, a!.averageRating]).toEqual([1, 4]);
    expect([b!.reviewCount, b!.averageRating]).toEqual([0, 0]);

    expect(await syncAllPublicReviewStats()).toBe(0);
  });
});
