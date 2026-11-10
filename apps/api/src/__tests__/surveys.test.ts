import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { submitSurvey } from '../services/surveys.js';

async function seedVisit() {
  const diner = await User.create({
    email: `survey-${Date.now()}@example.org`,
    passwordHash: 'x',
    firstName: 'Behruz',
    lastName: 'Guest',
    role: 'diner',
  });
  const restaurant = await Restaurant.create({
    name: 'Survey Kitchen',
    slug: `survey-${Date.now()}`,
    cuisine: 'Uzbek',
    priceRange: 2,
    status: 'approved',
    ownerId: new mongoose.Types.ObjectId(),
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const slotStart = new Date(Date.now() - 3 * 60 * 60_000);
  const reservation = await Reservation.create({
    restaurantId: restaurant._id,
    dinerId: diner._id,
    tableIds: [new mongoose.Types.ObjectId()],
    partySize: 2,
    slotStart,
    slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
    status: 'completed',
  });
  return { diner, restaurant, reservation };
}

describe('submitSurvey', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('publishes the survey as the visit review and rejects a second submission cleanly', async () => {
    const { diner, restaurant, reservation } = await seedVisit();
    const input = {
      reservationId: reservation._id.toString(),
      overallRating: 4,
      foodRating: 5,
      ambienceRating: 3,
      feedback: '<p>Great plov</p>',
    };

    await submitSurvey(diner, input);
    const review = await Review.findOne({ reservationId: reservation._id }).lean();
    expect(review).toMatchObject({ rating: 4, foodRating: 5, atmosphereRating: 3, comment: 'Great plov' });
    const fresh = await Restaurant.findById(restaurant._id).lean();
    expect(fresh!.reviewCount).toBe(1);

    await expect(submitSurvey(diner, input)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('keeps an existing review instead of overwriting it', async () => {
    const { diner, reservation } = await seedVisit();
    await Review.create({
      restaurantId: reservation.restaurantId,
      dinerId: diner._id,
      reservationId: reservation._id,
      rating: 2,
      comment: 'Original',
    });
    await submitSurvey(diner, { reservationId: reservation._id.toString(), overallRating: 5 });
    const reviews = await Review.find({ reservationId: reservation._id }).lean();
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.comment).toBe('Original');
  });
});
