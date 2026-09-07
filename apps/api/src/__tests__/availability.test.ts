import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { getAvailability } from '../services/availability.js';

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
        city: 'Testville',
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
    const today = toIsoDate(new Date());
    const now = new Date();
    now.setHours(14, 53, 0, 0);

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
      ...slots.map((s) => new Date(s.time).getHours()),
    );
    expect(earliestLocalHour).toBeGreaterThanOrEqual(15);
  });

  it('returns morning slots when now is before the shift starts', async () => {
    const today = toIsoDate(new Date());
    const now = new Date();
    now.setHours(9, 0, 0, 0);

    const slots = await getAvailability({
      restaurantId,
      date: today,
      partySize: 2,
      now,
    });

    expect(slots.some((s) => new Date(s.time).getHours() === 11)).toBe(true);
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
    const date = toIsoDate(tomorrow);
    const now = new Date();
    now.setHours(9, 0, 0, 0);

    const slots = await getAvailability({
      restaurantId,
      date,
      partySize: 2,
      now,
    });

    const localHm = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const times = slots.map((s) => localHm(s.time));

    expect(times).toContain('11:30');
    expect(times).toContain('14:15');
    expect(times).not.toContain('14:30');
    expect(times).toContain('17:00');
    expect(times).toContain('21:45');
    expect(times).not.toContain('22:00');
  });
});
