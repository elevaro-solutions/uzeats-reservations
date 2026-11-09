import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import { getFloorPlanOps } from '../services/floorPlanOps.js';

describe('live floor occupancy', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('shows a party seated today even when their booking slot is on another day', async () => {
    const restaurant = await Restaurant.create({
      name: 'Floor Kitchen',
      slug: `floor-${Date.now()}`,
      cuisine: 'Uzbek',
      priceRange: 2,
      status: 'approved',
      ownerId: new mongoose.Types.ObjectId(),
      address: { line1: '1 Test', city: 'Philadelphia', state: 'PA', zip: '19103' },
      location: { type: 'Point', coordinates: [-75.16, 39.95] },
    });
    const table = await Table.create({
      restaurantId: restaurant._id,
      name: 'AC2-1',
      minCapacity: 1,
      maxCapacity: 2,
      active: true,
    });
    const slotStart = new Date(Date.now() + 30 * 60 * 60_000);
    await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: new mongoose.Types.ObjectId(),
      tableIds: [table._id],
      partySize: 1,
      slotStart,
      slotEnd: new Date(slotStart.getTime() + 90 * 60_000),
      status: 'seated',
      seatedAt: new Date(),
    });

    const ops = await getFloorPlanOps(restaurant._id.toString());
    const state = ops.tables.find((t) => t.table._id.equals(table._id));
    expect(state?.status).toBe('seated');
  });
});
