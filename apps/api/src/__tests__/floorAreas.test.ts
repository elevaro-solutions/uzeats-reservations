import { beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import {
  deleteFloorAreaDoc,
  ensureFloorAreaDoc,
  renameFloorAreaDoc,
} from '../services/floorAreas.js';

describe('floorAreas service', () => {
  let restaurantId: Types.ObjectId;

  beforeEach(async () => {
    const restaurant = await Restaurant.create({
      name: 'Area Test Bistro',
      slug: `area-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      cuisine: 'American',
      priceRange: 2,
      ownerId: new Types.ObjectId(),
      status: 'approved',
      address: {
        line1: '1 Test St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
      },
      location: { type: 'Point', coordinates: [-97.74, 30.27] },
    });
    restaurantId = restaurant._id;
  });

  it('ensures a named area appearance', async () => {
    const doc = await ensureFloorAreaDoc(restaurantId.toString(), '  Patio ');
    const names = (doc.floorPlanAreaAppearances ?? []).map(
      (a: { floorArea?: string }) => a.floorArea,
    );
    expect(names).toContain('Patio');
  });

  it('renames tables and appearances together', async () => {
    await ensureFloorAreaDoc(restaurantId.toString(), 'Patio');
    await Table.create({
      restaurantId,
      name: 'P1',
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Patio',
    });
    await Table.create({
      restaurantId,
      name: 'P2',
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'patio',
    });

    await renameFloorAreaDoc(restaurantId.toString(), 'Patio', 'Garden');

    const tables = await Table.find({ restaurantId }).lean();
    expect(tables.every((t) => t.floorArea === 'Garden')).toBe(true);
    const restaurant = await Restaurant.findById(restaurantId).lean();
    expect(
      (restaurant?.floorPlanAreaAppearances ?? []).some(
        (a: { floorArea?: string }) => a.floorArea === 'Garden',
      ),
    ).toBe(true);
  });

  it('blocks deleting an area that still has tables', async () => {
    await ensureFloorAreaDoc(restaurantId.toString(), 'Patio');
    await Table.create({
      restaurantId,
      name: 'P1',
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Patio',
    });
    await expect(deleteFloorAreaDoc(restaurantId.toString(), 'Patio')).rejects.toThrow(
      /Move or delete/,
    );
  });

  it('deletes an empty custom area and refuses Main', async () => {
    await ensureFloorAreaDoc(restaurantId.toString(), 'Rooftop');
    const doc = await deleteFloorAreaDoc(restaurantId.toString(), 'Rooftop');
    expect(
      (doc.floorPlanAreaAppearances ?? []).some(
        (a: { floorArea?: string }) => a.floorArea === 'Rooftop',
      ),
    ).toBe(false);
    await expect(deleteFloorAreaDoc(restaurantId.toString(), 'Main')).rejects.toThrow(
      /Main area cannot be deleted/,
    );
  });
});
