import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { AccessRule } from '../models/AccessRule.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import {
  checkAccessRules,
  partySizeAllowedAt,
  partySizeRulesByRestaurant,
} from '../services/accessRules.js';

async function seed() {
  const restaurant = await Restaurant.create({
    name: 'Osiyo Restaurant',
    slug: `osiyo-${Date.now()}`,
    cuisine: 'Uzbek',
    priceRange: 2,
    status: 'approved',
    ownerId: new mongoose.Types.ObjectId(),
    address: { line1: '1 Test', city: 'Seattle', state: 'WA', zip: '98101' },
    location: { type: 'Point', coordinates: [-122.33, 47.61] },
  });
  await Subscription.create({
    restaurantId: restaurant._id,
    plan: 'core',
    status: 'active',
    monthlyPriceCents: 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
  });
  return restaurant;
}

describe('access rules', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('blocks a party below the rule minimum on a covered weekday and date', async () => {
    const restaurant = await seed();
    await AccessRule.create({
      restaurantId: restaurant._id,
      name: "Weekend's large party",
      daysOfWeek: [0, 1, 2],
      startDate: '2026-11-10',
      endDate: '2026-11-26',
      minPartySize: 5,
      maxPartySize: 10,
      active: true,
    });
    // Tuesday Nov 17, 2026, 7 PM Pacific.
    const slotStart = new Date('2026-11-18T03:00:00.000Z');
    const id = restaurant._id.toString();
    expect(await checkAccessRules({ restaurantId: id, partySize: 2, slotStart })).toMatch(
      /minimum party size is 5/,
    );
    expect(await checkAccessRules({ restaurantId: id, partySize: 6, slotStart })).toBeNull();
    // Wednesday is outside the rule's days.
    expect(
      await checkAccessRules({
        restaurantId: id,
        partySize: 2,
        slotStart: new Date('2026-11-19T03:00:00.000Z'),
      }),
    ).toBeNull();
  });

  it('marks slots blocked by a party-size rule unavailable for diners', async () => {
    const restaurant = await seed();
    await AccessRule.create({
      restaurantId: restaurant._id,
      name: 'Large parties only',
      minPartySize: 5,
      maxPartySize: 10,
      active: true,
    });
    const rules = await partySizeRulesByRestaurant([restaurant._id]);
    const list = rules.get(restaurant._id.toString()) ?? [];
    const slot = new Date('2026-11-18T03:00:00.000Z');
    expect(partySizeAllowedAt(list, 2, slot, 'America/Los_Angeles')).toBe(false);
    expect(partySizeAllowedAt(list, 6, slot, 'America/Los_Angeles')).toBe(true);
  });

  it('counts existing covers for the per-slot cap', async () => {
    const restaurant = await seed();
    await AccessRule.create({
      restaurantId: restaurant._id,
      name: 'Cap',
      maxCoversPerSlot: 6,
      active: true,
    });
    const slotStart = new Date('2026-11-18T03:00:00.000Z');
    await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: new mongoose.Types.ObjectId(),
      tableIds: [new mongoose.Types.ObjectId()],
      partySize: 4,
      slotStart,
      slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
      status: 'confirmed',
    });
    expect(
      await checkAccessRules({ restaurantId: restaurant._id.toString(), partySize: 4, slotStart }),
    ).toMatch(/fully committed/);
  });
});
