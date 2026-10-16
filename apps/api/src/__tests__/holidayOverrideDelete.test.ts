import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { DateScheduleOverride } from '../models/DateScheduleOverride.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { ensureUpcomingHolidayApprovals } from '../services/holidays.js';

async function seedRestaurant() {
  const owner = await User.create({
    email: `holiday-owner-${Date.now()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Hol',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'Holiday Test Kitchen',
    slug: `holiday-kit-${Date.now()}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    applyPlatformHolidays: true,
    requireHolidayApproval: true,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  return { owner, restaurant };
}

describe('platform holiday enable/disable (no delete)', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('keeps a rejected platform holiday so it can be re-enabled without re-seed churn', async () => {
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();

    await ensureUpcomingHolidayApprovals(restaurantId);
    const pending = await DateScheduleOverride.find({
      restaurantId: restaurant._id,
      source: 'platform_holiday',
      status: 'pending',
    });
    expect(pending.length).toBeGreaterThan(0);

    const target = pending[0]!;
    // Mimic reviewDateScheduleOverride → rejected (disable closing).
    target.status = 'rejected';
    target.reviewedAt = new Date();
    await target.save();

    await ensureUpcomingHolidayApprovals(restaurantId);

    const sameDate = await DateScheduleOverride.findOne({
      restaurantId: restaurant._id,
      date: target.date,
    });
    expect(sameDate).not.toBeNull();
    expect(sameDate!.status).toBe('rejected');
    expect(sameDate!._id.toString()).toBe(target._id.toString());
    expect(sameDate!.source).toBe('platform_holiday');
  });

  it('hard-deleted holiday rows are re-seeded (why delete is forbidden)', async () => {
    const { restaurant } = await seedRestaurant();
    const restaurantId = restaurant._id.toString();

    await ensureUpcomingHolidayApprovals(restaurantId);
    const pending = await DateScheduleOverride.findOne({
      restaurantId: restaurant._id,
      source: 'platform_holiday',
      status: 'pending',
    });
    expect(pending).not.toBeNull();
    const date = pending!.date;
    await pending!.deleteOne();

    await ensureUpcomingHolidayApprovals(restaurantId);
    const reseeded = await DateScheduleOverride.findOne({
      restaurantId: restaurant._id,
      date,
      source: 'platform_holiday',
    });
    expect(reseeded).not.toBeNull();
    expect(reseeded!.status).toBe('pending');
  });

  it('allows hard delete of manual overrides without reappearance', async () => {
    const { restaurant } = await seedRestaurant();
    const doc = await DateScheduleOverride.create({
      restaurantId: restaurant._id,
      date: '2099-06-15',
      mode: 'closed',
      reason: 'Private event',
      source: 'manual',
      status: 'approved',
    });
    await doc.deleteOne();
    await ensureUpcomingHolidayApprovals(restaurant._id.toString());
    const gone = await DateScheduleOverride.findOne({
      restaurantId: restaurant._id,
      date: '2099-06-15',
    });
    expect(gone).toBeNull();
  });
});
