import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { isoDateInTimeZone, zonedWallClockToUtc } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { PrivateDiningSpace } from '../models/PrivateDining.js';
import { getAvailability } from '../services/availability.js';

const TZ = 'America/Los_Angeles';

describe('getAvailability private dining', () => {
  let restaurantId: string;
  let spaceId: string;

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const owner = await User.create({
      email: 'private-dining-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Private',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });

    const restaurant = await Restaurant.create({
      name: 'Private Dining Kitchen',
      slug: `private-dining-${Date.now()}`,
      cuisine: 'American',
      priceRange: 2,
      status: 'approved',
      ownerId: owner._id,
      address: {
        line1: '1 Test St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
      },
      location: { type: 'Point', coordinates: [-118.24, 34.05] },
    });
    restaurantId = restaurant._id.toString();

    await Table.create({
      restaurantId: restaurant._id,
      name: 'Main-4',
      minCapacity: 2,
      maxCapacity: 4,
      active: true,
    });

    const space = await PrivateDiningSpace.create({
      restaurantId: restaurant._id,
      name: 'Private room',
      minGuests: 12,
      maxGuests: 20,
      rentalFeeCents: 30000,
      minimumSpendCents: 120000,
      active: true,
    });
    spaceId = space._id.toString();

    await Shift.create({
      restaurantId: restaurant._id,
      name: 'Dinner',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '17:00',
      endTime: '22:00',
      slotIntervalMinutes: 30,
      turnTimeMinutes: 120,
      active: true,
    });
  });

  it('returns no slots for a large party without private dining', async () => {
    const today = isoDateInTimeZone(new Date(), TZ);
    const now = zonedWallClockToUtc(today, '10:00', TZ);

    const slots = await getAvailability({
      restaurantId,
      date: today,
      partySize: 12,
      now,
    });

    expect(slots).toEqual([]);
  });

  it('creates backing inventory and returns slots when private dining is selected', async () => {
    const today = isoDateInTimeZone(new Date(), TZ);
    const now = zonedWallClockToUtc(today, '10:00', TZ);

    const slots = await getAvailability({
      restaurantId,
      date: today,
      partySize: 12,
      privateDiningSpaceId: spaceId,
      now,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.available)).toBe(true);

    const space = await PrivateDiningSpace.findById(spaceId);
    expect(space?.tableIds?.length).toBe(1);

    const backing = await Table.findById(space!.tableIds![0]);
    expect(backing?.privateDiningOnly).toBe(true);
    expect(backing?.minCapacity).toBe(12);
    expect(backing?.maxCapacity).toBe(20);
  });

  it('keeps private-dining-only tables out of regular availability', async () => {
    const today = isoDateInTimeZone(new Date(), TZ);
    const now = zonedWallClockToUtc(today, '10:00', TZ);

    await getAvailability({
      restaurantId,
      date: today,
      partySize: 12,
      privateDiningSpaceId: spaceId,
      now,
    });

    const regular = await getAvailability({
      restaurantId,
      date: today,
      partySize: 12,
      now,
    });
    expect(regular).toEqual([]);

    const smallParty = await getAvailability({
      restaurantId,
      date: today,
      partySize: 2,
      now,
    });
    expect(smallParty.some((s) => s.available)).toBe(true);
  });
});
