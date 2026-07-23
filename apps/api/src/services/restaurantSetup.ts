import type { Types } from 'mongoose';
import { Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';

/** Minimal tables + shifts so partners can take reservations right after signup. */
export async function provisionDefaultRestaurantSetup(restaurantId: Types.ObjectId) {
  const hasTables = await Table.exists({ restaurantId });
  if (!hasTables) {
    await Table.create({
      restaurantId,
      name: 'Table 1',
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Main',
    });
  }

  const hasShifts = await Shift.exists({ restaurantId });
  if (!hasShifts) {
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
  }
}
