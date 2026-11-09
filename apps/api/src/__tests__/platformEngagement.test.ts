import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { resolvePlatformEngagementRecipients } from '../services/platformEngagement.js';

async function diner(email: string) {
  return User.create({
    email,
    passwordHash: 'x',
    firstName: email.split('@')[0],
    lastName: 'Diner',
    role: 'diner',
  });
}

async function book(restaurantId: mongoose.Types.ObjectId, dinerId: unknown, status: string) {
  const slotStart = new Date('2026-11-05T13:30:00.000Z');
  await Reservation.collection.insertOne({
    restaurantId,
    dinerId,
    status,
    partySize: 2,
    slotStart,
    slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
    createdAt: new Date(),
  });
}

describe('platform engagement audience', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('includes diners with upcoming bookings when asked, and never cancelled-only diners', async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const upcoming = await diner('upcoming@example.org');
    const visited = await diner('visited@example.org');
    const cancelled = await diner('cancelled@example.org');
    await book(restaurantId, upcoming._id, 'confirmed');
    await book(restaurantId, visited._id, 'completed');
    await book(restaurantId, cancelled._id, 'cancelled');

    const pastOnly = await resolvePlatformEngagementRecipients({ restaurantId: restaurantId.toString() });
    expect(pastOnly.map((u) => u.email)).toEqual(['visited@example.org']);

    const everyone = await resolvePlatformEngagementRecipients({
      restaurantId: restaurantId.toString(),
      reservationStatuses: ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'],
    });
    expect(everyone.map((u) => u.email).sort()).toEqual([
      'upcoming@example.org',
      'visited@example.org',
    ]);
  });
});
