import mongoose from 'mongoose';
import { Table } from '../models/Table.js';
import { Shift } from '../models/Shift.js';
import { Menu } from '../models/Menu.js';

export type RestaurantShellCounts = {
  tableCount: number;
  shiftCount: number;
  hasMenuItems: boolean;
};

/**
 * Batch table/shift/menu counts for owner shell lists (avoids N nested field resolvers).
 */
export async function loadRestaurantShellCounts(
  restaurantIds: string[],
): Promise<Map<string, RestaurantShellCounts>> {
  const result = new Map<string, RestaurantShellCounts>();
  for (const id of restaurantIds) {
    result.set(id, { tableCount: 0, shiftCount: 0, hasMenuItems: false });
  }
  if (restaurantIds.length === 0) return result;

  const objectIds = restaurantIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (objectIds.length === 0) return result;

  const [tableRows, shiftRows, menus] = await Promise.all([
    Table.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { restaurantId: { $in: objectIds } } },
      { $group: { _id: '$restaurantId', n: { $sum: 1 } } },
    ]),
    Shift.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { restaurantId: { $in: objectIds } } },
      { $group: { _id: '$restaurantId', n: { $sum: 1 } } },
    ]),
    Menu.find({ restaurantId: { $in: objectIds } })
      .select('restaurantId sections')
      .lean(),
  ]);

  for (const row of tableRows) {
    const entry = result.get(String(row._id));
    if (entry) entry.tableCount = row.n;
  }
  for (const row of shiftRows) {
    const entry = result.get(String(row._id));
    if (entry) entry.shiftCount = row.n;
  }
  for (const menu of menus) {
    const entry = result.get(String(menu.restaurantId));
    if (!entry) continue;
    entry.hasMenuItems = (menu.sections ?? []).some(
      (section: { items?: unknown[] }) => (section.items?.length ?? 0) > 0,
    );
  }

  return result;
}

export function withRestaurantShellCounts<T extends { id: string }>(
  restaurants: T[],
  counts: Map<string, RestaurantShellCounts>,
): Array<T & RestaurantShellCounts> {
  return restaurants.map((r) => {
    const c = counts.get(r.id) ?? {
      tableCount: 0,
      shiftCount: 0,
      hasMenuItems: false,
    };
    return { ...r, ...c };
  });
}
