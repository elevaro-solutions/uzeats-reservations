import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { GuestProfile } from '../models/GuestProfile.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { WaitlistEntry } from '../models/Waitlist.js';
import { deleteMyAccount } from '../services/deleteMyAccount.js';

async function seedDiner(opts?: {
  withNoShow?: boolean;
  unpaidFee?: boolean;
  seated?: boolean;
  upcoming?: boolean;
}) {
  const diner = await User.create({
    email: `del-diner-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash: 'unused',
    firstName: 'Alex',
    lastName: 'Rivera',
    phone: `+1555${String(Date.now()).slice(-7)}`,
    role: 'diner',
  });
  const owner = await User.create({
    email: `owner-${Date.now()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Owner',
    lastName: 'Test',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'No-Show Kitchen',
    slug: `noshow-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });

  if (opts?.withNoShow || opts?.unpaidFee || opts?.seated || opts?.upcoming) {
    const status = opts.seated
      ? 'seated'
      : opts.upcoming
        ? 'confirmed'
        : 'no_show';
    await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: diner._id,
      tableIds: [],
      partySize: 2,
      slotStart: new Date(Date.now() + (opts.upcoming ? 86400000 : -86400000)),
      slotEnd: new Date(Date.now() + (opts.upcoming ? 90000000 : -82800000)),
      status,
      guestNotes: 'Window seat please — Alex Rivera 555-0100',
      noShowFeeCents: opts.unpaidFee ? 2500 : 0,
      cardGuaranteeStatus: opts.unpaidFee ? 'failed' : 'none',
    });
  }

  await GuestProfile.create({
    restaurantId: restaurant._id,
    dinerId: diner._id,
    tags: ['vip'],
    notes: 'Always late',
  });

  await WaitlistEntry.create({
    restaurantId: restaurant._id,
    dinerId: diner._id,
    guestName: 'Alex Rivera',
    guestPhone: '+15550100',
    partySize: 2,
    preferredDate: '2026-10-20',
    status: 'waiting',
  });

  return { diner, restaurant };
}

describe('deleteMyAccount', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('blocks when an unpaid no-show fee remains', async () => {
    const { diner } = await seedDiner({ unpaidFee: true });
    await expect(deleteMyAccount(diner._id.toString())).rejects.toThrow(
      /Settle outstanding no-show/,
    );
  });

  it('blocks while seated', async () => {
    const { diner } = await seedDiner({ seated: true });
    await expect(deleteMyAccount(diner._id.toString())).rejects.toThrow(
      /current visit/,
    );
  });

  it('anonymizes history so restaurants no longer see the diner identity', async () => {
    const { diner, restaurant } = await seedDiner({ withNoShow: true });

    const result = await deleteMyAccount(diner._id.toString());
    expect(result.success).toBe(true);

    const tombstone = await User.findById(diner._id);
    expect(tombstone!.deletedAt).toBeTruthy();
    expect(tombstone!.firstName).toBe('Guest');
    expect(tombstone!.email).toBeFalsy();
    expect(tombstone!.phone).toBeFalsy();
    expect(tombstone!.lastName).toBe('');

    const reservation = await Reservation.findOne({ dinerId: diner._id });
    expect(reservation!.status).toBe('no_show');
    expect(reservation!.guestNotes).toBe('');

    expect(await GuestProfile.findOne({ dinerId: diner._id })).toBeNull();

    const waitlist = await WaitlistEntry.findOne({ restaurantId: restaurant._id });
    expect(waitlist!.guestName).toBe('Guest');
    expect(waitlist!.guestPhone).toBe('');
    expect(waitlist!.dinerId).toBeFalsy();
    expect(waitlist!.status).toBe('cancelled');
  });

  it('cancels upcoming bookings without leaving PII notes', async () => {
    const { diner } = await seedDiner({ upcoming: true });
    await deleteMyAccount(diner._id.toString());
    const reservation = await Reservation.findOne({ dinerId: diner._id });
    expect(reservation!.status).toBe('cancelled');
    expect(reservation!.cancellationReason).toBe('Account deleted');
    expect(reservation!.guestNotes).toBe('');
  });
});
