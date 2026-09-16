import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { hmInTimeZone, isoDateInTimeZone, zonedWallClockToUtc } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { getAvailability } from '../services/availability.js';

const TZ = 'America/Los_Angeles';

describe('getAvailability past-slot omission', () => {
  let restaurantId: string;

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});

    const owner = await User.create({
      email: 'avail-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Avail',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });

    const restaurant = await Restaurant.create({
      name: 'Avail Test Kitchen',
      slug: `avail-test-${Date.now()}`,
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
      name: 'T1',
      minCapacity: 1,
      maxCapacity: 4,
      active: true,
    });

    await Shift.create({
      restaurantId: restaurant._id,
      name: 'All day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '11:00',
      endTime: '22:00',
      slotIntervalMinutes: 15,
      turnTimeMinutes: 90,
      active: true,
    });
  });

  it('omits slots at or before the injected now for today', async () => {
    const today = isoDateInTimeZone(new Date(), TZ);
    const now = zonedWallClockToUtc(today, '14:53', TZ);

    const slots = await getAvailability({
      restaurantId,
      date: today,
      partySize: 2,
      now,
    });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(new Date(slot.time).getTime()).toBeGreaterThan(now.getTime());
    }

    const earliestLocalHour = Math.min(
      ...slots.map((s) => Number(hmInTimeZone(new Date(s.time), TZ).slice(0, 2))),
    );
    expect(earliestLocalHour).toBeGreaterThanOrEqual(15);
  });

  it('returns morning slots when now is before the shift starts', async () => {
    const today = isoDateInTimeZone(new Date(), TZ);
    const now = zonedWallClockToUtc(today, '09:00', TZ);

    const slots = await getAvailability({
      restaurantId,
      date: today,
      partySize: 2,
      now,
    });

    expect(slots.some((s) => hmInTimeZone(new Date(s.time), TZ) === '11:00')).toBe(true);
  });

  it('offers starts until shift endTime even when turn extends past close', async () => {
    await Shift.deleteMany({ restaurantId });
    await Shift.create({
      restaurantId,
      name: 'Lunch',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '11:30',
      endTime: '14:30',
      slotIntervalMinutes: 15,
      turnTimeMinutes: 75,
      active: true,
    });
    await Shift.create({
      restaurantId,
      name: 'Dinner',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '17:00',
      endTime: '22:00',
      slotIntervalMinutes: 15,
      turnTimeMinutes: 90,
      active: true,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = isoDateInTimeZone(tomorrow, TZ);
    const now = zonedWallClockToUtc(isoDateInTimeZone(new Date(), TZ), '09:00', TZ);

    const slots = await getAvailability({
      restaurantId,
      date,
      partySize: 2,
      now,
    });

    const times = slots.map((s) => hmInTimeZone(new Date(s.time), TZ));

    expect(times).toContain('11:30');
    expect(times).toContain('14:15');
    expect(times).not.toContain('14:30');
    expect(times).toContain('17:00');
    expect(times).toContain('21:45');
    expect(times).not.toContain('22:00');
  });
});
