import { beforeEach, describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import {
  findFreeFloorSpot,
  findFreeFloorSpotNear,
  rotatedFloorRectBounds,
} from '@reservations/shared';
import { Table } from '../models/Table.js';
import { placeNewTable } from '../services/tablePlacement.js';

describe('findFreeFloorSpot', () => {
  it('returns the origin on an empty grid', () => {
    expect(findFreeFloorSpot([])).toEqual({ posX: 0, posY: 0 });
  });

  it('scans left-to-right, then wraps to the next row', () => {
    const row = Array.from({ length: 12 }, (_, i) => ({ posX: i * 2, posY: 0, width: 2, height: 2 }));
    expect(findFreeFloorSpot(row.slice(0, 2))).toEqual({ posX: 4, posY: 0 });
    expect(findFreeFloorSpot(row)).toEqual({ posX: 0, posY: 2 });
  });

  it('fills a gap that fits the requested size', () => {
    const occupied = [
      { posX: 0, posY: 0, width: 2, height: 2 },
      { posX: 5, posY: 0, width: 2, height: 2 },
    ];
    expect(findFreeFloorSpot(occupied, 3, 2)).toEqual({ posX: 2, posY: 0 });
    expect(findFreeFloorSpot(occupied, 4, 2)).toEqual({ posX: 7, posY: 0 });
  });

  it('respects a gap and a row limit', () => {
    const occupied = [{ posX: 0, posY: 0, width: 2, height: 2 }];
    expect(findFreeFloorSpot(occupied, 2, 2, 8, { rows: 6, gap: 1 })).toEqual({ posX: 3, posY: 0 });
  });
});

describe('findFreeFloorSpotNear', () => {
  const canvas = { cols: 12, rows: 8 };

  it('puts a copy directly below the source with a gap', () => {
    const source = { posX: 4, posY: 1, width: 2, height: 2 };
    expect(findFreeFloorSpotNear(source, [source], canvas)).toEqual({ posX: 4, posY: 4 });
  });

  it('falls back to the right when there is no room below', () => {
    const source = { posX: 2, posY: 5, width: 2, height: 2 };
    expect(findFreeFloorSpotNear(source, [source], canvas)).toEqual({ posX: 5, posY: 5 });
  });

  it('never returns a spot outside the canvas', () => {
    const source = { posX: 10, posY: 6, width: 2, height: 2 };
    const spot = findFreeFloorSpotNear(source, [source], canvas)!;
    expect(spot.posX + 2).toBeLessThanOrEqual(canvas.cols);
    expect(spot.posY + 2).toBeLessThanOrEqual(canvas.rows);
  });

  it('returns null when the canvas is full', () => {
    const source = { posX: 0, posY: 0, width: 4, height: 4 };
    expect(findFreeFloorSpotNear(source, [source], { cols: 5, rows: 5 })).toBeNull();
  });

  it('keeps a rotated copy inside the canvas', () => {
    const source = { posX: 1, posY: 0.5, width: 4, height: 1, rotation: 90 };
    const spot = findFreeFloorSpotNear(source, [source], canvas)!;
    const bounds = rotatedFloorRectBounds({ ...spot, width: 4, height: 1, rotation: 90 });
    expect(bounds.posY + bounds.height).toBeLessThanOrEqual(canvas.rows);
    expect(bounds.posX).toBeGreaterThanOrEqual(0);
  });
});

describe('placeNewTable', () => {
  let restaurantId = new Types.ObjectId();

  beforeEach(() => {
    restaurantId = new Types.ObjectId();
  });

  async function seed(name: string, floorArea: string, posX: number, posY: number) {
    await Table.create({ restaurantId, name, minCapacity: 2, maxCapacity: 4, floorArea, posX, posY });
  }

  it('moves a colliding table to the first free spot in the same area', async () => {
    await seed('T1', 'Main', 0, 0);
    await seed('T2', 'main', 2, 0);
    await seed('P1', 'Patio', 4, 0);
    expect(await placeNewTable(restaurantId, 'Main', { posX: 0, posY: 0 })).toEqual({
      posX: 4,
      posY: 0,
      width: 2,
      height: 2,
    });
    expect(await placeNewTable(restaurantId, 'Main', {})).toMatchObject({ posX: 4, posY: 0 });
  });

  it('keeps a requested position that is free', async () => {
    await seed('T1', 'Main', 0, 0);
    expect(await placeNewTable(restaurantId, 'Main', { posX: 10, posY: 6, width: 3 })).toEqual({
      posX: 10,
      posY: 6,
      width: 3,
      height: 2,
    });
  });
});
