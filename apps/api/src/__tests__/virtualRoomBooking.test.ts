import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { AddonFee } from '../models/AddonFee.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Shift } from '../models/Shift.js';
import { Subscription } from '../models/Subscription.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import { getPlatformConfig } from '../services/platformConfig.js';
import { updateReservationStatus } from '../services/reservations.js';
import { publishVirtualRoom, setVirtualRoomAddon } from '../services/virtualRoom.js';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';

const CREATE = `mutation CreateReservation($input: ReservationInput!) {
  createReservation(input: $input) { reservation { id tableSelectionSource } }
}`;

describe('3D table selection booking (E2E)', () => {
  let agent: request.Agent;
  let dinerToken: string;
  let restaurantId: string;
  let ownerId: string;
  let tableIds: string[] = [];

  const slotAt = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const diner = await registerUser(agent, {
      email: 'vr-diner@test.com',
      password: 'Password123!',
      firstName: 'Dina',
      lastName: 'Diner',
    });
    dinerToken = diner.accessToken;

    const owner = await User.create({
      email: 'vr-owner@test.com',
      passwordHash: 'unused',
      firstName: 'Olga',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    ownerId = owner._id.toString();
    const restaurant = await Restaurant.create({
      name: '3D Bistro',
      slug: 'three-d-bistro',
      cuisine: 'Italian',
      priceRange: 2,
      status: 'approved',
      ownerId: owner._id,
      allowGuestTableSelection: false,
      address: { line1: '1 Main St', city: 'New York', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.93, 40.73] },
    });
    restaurantId = restaurant._id.toString();
    await Subscription.create({
      restaurantId: restaurant._id,
      plan: 'core',
      status: 'active',
      monthlyPriceCents: 9900,
      networkCoverFeeCents: 0,
      websiteCoverFeeCents: 0,
    });
    const tables = await Table.create([
      { restaurantId, name: 'T1', minCapacity: 1, maxCapacity: 4, posX: 1, posY: 1, width: 2, height: 2 },
      { restaurantId, name: 'T2', minCapacity: 1, maxCapacity: 4, posX: 5, posY: 1, width: 2, height: 2 },
    ]);
    tableIds = tables.map((t) => t._id.toString());
    await Shift.create({
      restaurantId,
      name: 'All day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '23:59',
      slotIntervalMinutes: 30,
      turnTimeMinutes: 90,
    });
  });

  it('rejects a table pick when list selection is off and no 3D room is live', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          restaurantId,
          partySize: 3,
          slotStart: slotAt(18),
          tableId: tableIds[0],
          tableSelectionSource: 'virtual_3d',
        },
      },
      dinerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/table selection is not enabled/i);
  });

  it('books a 3D-picked table once the room is live and bills the guest fee on completion', async () => {
    await getPlatformConfig();
    await PlatformConfig.updateOne({ key: 'default' }, { $set: { 'featureFlags.virtualRoom3d': true } });
    await setVirtualRoomAddon(restaurantId, true);
    await publishVirtualRoom(restaurantId, true);

    const list = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          restaurantId,
          partySize: 2,
          slotStart: slotAt(12),
          tableId: tableIds[1],
          tableSelectionSource: 'list',
        },
      },
      dinerToken,
    );
    expect(list.body.errors?.[0]?.message).toMatch(/table selection is not enabled/i);

    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          restaurantId,
          partySize: 3,
          slotStart: slotAt(18),
          tableId: tableIds[0],
          tableSelectionSource: 'virtual_3d',
        },
      },
      dinerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const reservationId = res.body.data.createReservation.reservation.id;
    expect(res.body.data.createReservation.reservation.tableSelectionSource).toBe('virtual_3d');

    const stored = await Reservation.findById(reservationId);
    expect(stored!.virtualRoomGuestFeeCents).toBe(200);
    expect(stored!.virtualRoomSelectionFeeMode).toBe('per_guest');
    expect(stored!.tableIds.map(String)).toEqual([tableIds[0]]);

    await Reservation.updateOne({ _id: reservationId }, { $set: { status: 'seated' } });
    await updateReservationStatus(reservationId, 'completed', ownerId);
    const fee = await AddonFee.findOne({ reservationId });
    expect(fee).toMatchObject({ partySize: 3, unitFeeCents: 200, feeCents: 600, status: 'pending' });
  });
});
