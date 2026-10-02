import {
  DEFAULT_TABLE_HEIGHT,
  DEFAULT_TABLE_WIDTH,
  findFreeFloorSpot,
  floorRectsOverlap,
  type FloorRect,
} from '@reservations/shared';
import type { Types } from 'mongoose';
import { Table } from '../models/Table.js';

/**
 * Layout for a new table in `floorArea`: keeps the requested position when it is
 * given and free, otherwise picks the first free grid spot among same-area tables
 * (area match is case-insensitive, like the floor-plan area filter).
 */
export async function placeNewTable(
  restaurantId: string | Types.ObjectId,
  floorArea: string,
  requested: Partial<FloorRect>,
): Promise<FloorRect> {
  const width = requested.width ?? DEFAULT_TABLE_WIDTH;
  const height = requested.height ?? DEFAULT_TABLE_HEIGHT;

  const area = floorArea.trim().toLowerCase();
  const tables = await Table.find({ restaurantId })
    .select('floorArea posX posY width height')
    .lean();
  const occupied: FloorRect[] = tables
    .filter((t) => (t.floorArea ?? 'Main').trim().toLowerCase() === area)
    .map((t) => ({
      posX: t.posX ?? 0,
      posY: t.posY ?? 0,
      width: t.width ?? DEFAULT_TABLE_WIDTH,
      height: t.height ?? DEFAULT_TABLE_HEIGHT,
    }));

  if (requested.posX != null && requested.posY != null) {
    const rect = { posX: requested.posX, posY: requested.posY, width, height };
    if (!occupied.some((r) => floorRectsOverlap(rect, r))) return rect;
  }

  return { ...findFreeFloorSpot(occupied, width, height), width, height };
}
