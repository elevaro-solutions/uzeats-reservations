import mongoose from 'mongoose';
import {
  restaurantTimeZone,
  weekdayInTimeZone,
  hmInTimeZone,
  zonedWallClockToUtc,
  type AvailabilitySlot,
} from '@reservations/shared';
import { Blackout, Shift } from '../models/Shift.js';
import { Table } from '../models/Table.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { SLOT_QUANTUM_MS, TableSlotClaim } from '../models/TableSlotClaim.js';
import { findClaimedTableIds, slotKeysForRange } from './tableSlotClaims.js';
import {
  getCachedAvailability,
  setCachedAvailability,
} from './availabilityCache.js';

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

type LeanRestaurant = {
  _id: mongoose.Types.ObjectId;
  status: string;
  address?: { state?: string; zip?: string; country?: string };
  location?: { coordinates?: number[] };
};

type LeanBlackout = {
  restaurantId: mongoose.Types.ObjectId;
  allDay?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
};

type LeanShift = {
  restaurantId: mongoose.Types.ObjectId;
  daysOfWeek?: number[] | null;
  startTime: string;
  endTime: string;
  slotIntervalMinutes?: number | null;
  turnTimeMinutes?: number | null;
};

type LeanTable = {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
};

type LeanReservation = {
  restaurantId: mongoose.Types.ObjectId;
  tableIds: mongoose.Types.ObjectId[];
  slotStart: Date;
  slotEnd: Date;
};

function computeSlotsForRestaurant(params: {
  restaurant: LeanRestaurant;
  date: string;
  partySize: number;
  now: Date;
  blackouts: LeanBlackout[];
  shifts: LeanShift[];
  tables: LeanTable[];
  reservations: LeanReservation[];
  claimsByTable: Map<string, Set<string>>;
}): AvailabilitySlot[] {
  const { restaurant, date, now, blackouts, shifts, tables, reservations, claimsByTable } =
    params;

  if (blackouts.some((b) => b.allDay)) return [];
  if (shifts.length === 0 || tables.length === 0) return [];

  const timeZone = restaurantTimeZone(restaurant);
  const dateAt = (hm: string) => zonedWallClockToUtc(date, hm, timeZone);

  const slots: AvailabilitySlot[] = [];

  for (const shift of shifts) {
    const interval = shift.slotIntervalMinutes ?? 15;
    const turn = shift.turnTimeMinutes ?? 90;
    let cursor = dateAt(shift.startTime);
    const end = dateAt(shift.endTime);

    while (cursor < end) {
      if (cursor.getTime() <= now.getTime()) {
        cursor = new Date(cursor.getTime() + interval * 60_000);
        continue;
      }

      // endTime is last seating window (exclusive): allow starts until end,
      // even when turn time extends past the shift close.
      const slotEnd = new Date(cursor.getTime() + turn * 60_000);

      const inBlackout = blackouts.some((b) => {
        if (b.allDay) return true;
        if (!b.startTime || !b.endTime) return false;
        const bs = dateAt(b.startTime);
        const be = dateAt(b.endTime);
        return overlaps(cursor, slotEnd, bs, be);
      });

      if (!inBlackout) {
        const slotKeys = new Set(slotKeysForRange(cursor, slotEnd));
        const freeTables = tables.filter((table) => {
          const claimed = claimsByTable.get(String(table._id));
          if (claimed) {
            for (const key of slotKeys) {
              if (claimed.has(key)) return false;
            }
          }
          const conflict = reservations.some((r) => {
            const tableMatch = r.tableIds.some((id) => id.equals(table._id));
            return tableMatch && overlaps(cursor, slotEnd, r.slotStart, r.slotEnd);
          });
          return !conflict;
        });

        slots.push({
          time: cursor.toISOString(),
          available: freeTables.length > 0,
          remainingTables: freeTables.length,
        });
      }

      cursor = new Date(cursor.getTime() + interval * 60_000);
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Batch availability for many restaurants on one calendar date.
 * Loads shared collections once instead of N × (Restaurant+Blackout+Shift+Table+Reservation+Claims).
 */
export async function getAvailabilityForRestaurants(params: {
  restaurantIds: string[];
  date: string;
  partySize: number;
  /** Injectable clock for tests; defaults to real now. */
  now?: Date;
}): Promise<Map<string, AvailabilitySlot[]>> {
  const result = new Map<string, AvailabilitySlot[]>();
  const uniqueIds = [...new Set(params.restaurantIds.filter(Boolean))];
  for (const id of uniqueIds) result.set(id, []);
  if (uniqueIds.length === 0) return result;

  // Skip Redis when tests inject `now` so clock-based assertions stay deterministic.
  const useCache = params.now == null;
  const uncachedIds: string[] = [];
  if (useCache) {
    await Promise.all(
      uniqueIds.map(async (id) => {
        const cached = await getCachedAvailability(id, params.date, params.partySize);
        if (cached) result.set(id, cached);
        else uncachedIds.push(id);
      }),
    );
  } else {
    uncachedIds.push(...uniqueIds);
  }

  if (uncachedIds.length === 0) return result;

  const objectIds = uncachedIds
    .map(toObjectId)
    .filter((id): id is mongoose.Types.ObjectId => id != null);
  if (objectIds.length === 0) return result;

  const now = params.now ?? new Date();

  const restaurants = (await Restaurant.find({
    _id: { $in: objectIds },
    status: 'approved',
  }).lean()) as LeanRestaurant[];
  if (restaurants.length === 0) return result;

  const approvedIds = restaurants.map((r) => r._id);

  const [blackouts, allShifts, tables, reservations] = await Promise.all([
    Blackout.find({
      restaurantId: { $in: approvedIds },
      date: params.date,
    }).lean() as Promise<LeanBlackout[]>,
    Shift.find({
      restaurantId: { $in: approvedIds },
      active: true,
    }).lean() as Promise<LeanShift[]>,
    Table.find({
      restaurantId: { $in: approvedIds },
      active: true,
      minCapacity: { $lte: params.partySize },
      maxCapacity: { $gte: params.partySize },
    }).lean() as Promise<LeanTable[]>,
    // Wide UTC window covering all US timezones for the calendar date.
    Reservation.find({
      restaurantId: { $in: approvedIds },
      status: { $in: ['pending', 'confirmed', 'seated'] },
      slotStart: {
        $lt: zonedWallClockToUtc(params.date, '23:59', 'Pacific/Kiritimati'),
      },
      slotEnd: {
        $gt: zonedWallClockToUtc(params.date, '00:00', 'Pacific/Pago_Pago'),
      },
    })
      .select('restaurantId tableIds slotStart slotEnd')
      .lean() as Promise<LeanReservation[]>,
  ]);

  let minDayStart = Number.POSITIVE_INFINITY;
  let maxDayEnd = Number.NEGATIVE_INFINITY;
  const dayBounds = new Map<string, { dayStart: Date; dayEnd: Date; dayOfWeek: number }>();

  for (const restaurant of restaurants) {
    const id = String(restaurant._id);
    const timeZone = restaurantTimeZone(restaurant);
    const dayStart = zonedWallClockToUtc(params.date, '00:00', timeZone);
    const dayEnd = zonedWallClockToUtc(params.date, '23:59', timeZone);
    const dayOfWeek = weekdayInTimeZone(
      zonedWallClockToUtc(params.date, '12:00', timeZone),
      timeZone,
    );
    dayBounds.set(id, { dayStart, dayEnd, dayOfWeek });
    minDayStart = Math.min(minDayStart, dayStart.getTime());
    maxDayEnd = Math.max(maxDayEnd, dayEnd.getTime());
  }

  const claimKeys =
    Number.isFinite(minDayStart) && Number.isFinite(maxDayEnd)
      ? slotKeysForRange(
          new Date(minDayStart),
          new Date(maxDayEnd + SLOT_QUANTUM_MS),
        )
      : [];

  const dayClaims =
    claimKeys.length === 0
      ? []
      : await TableSlotClaim.find({
          restaurantId: { $in: approvedIds },
          slotKey: { $in: claimKeys },
        })
          .select('restaurantId tableId slotKey')
          .lean();

  const blackoutsByRestaurant = new Map<string, LeanBlackout[]>();
  for (const b of blackouts) {
    const id = String(b.restaurantId);
    const list = blackoutsByRestaurant.get(id);
    if (list) list.push(b);
    else blackoutsByRestaurant.set(id, [b]);
  }

  const shiftsByRestaurant = new Map<string, LeanShift[]>();
  for (const s of allShifts) {
    const id = String(s.restaurantId);
    const list = shiftsByRestaurant.get(id);
    if (list) list.push(s);
    else shiftsByRestaurant.set(id, [s]);
  }

  const tablesByRestaurant = new Map<string, LeanTable[]>();
  for (const t of tables) {
    const id = String(t.restaurantId);
    const list = tablesByRestaurant.get(id);
    if (list) list.push(t);
    else tablesByRestaurant.set(id, [t]);
  }

  const reservationsByRestaurant = new Map<string, LeanReservation[]>();
  for (const r of reservations) {
    const id = String(r.restaurantId);
    const bounds = dayBounds.get(id);
    if (!bounds) continue;
    if (r.slotStart >= bounds.dayEnd || r.slotEnd <= bounds.dayStart) continue;
    const list = reservationsByRestaurant.get(id);
    if (list) list.push(r);
    else reservationsByRestaurant.set(id, [r]);
  }

  const claimsByRestaurantTable = new Map<string, Map<string, Set<string>>>();
  for (const claim of dayClaims) {
    const rid = String(claim.restaurantId);
    let byTable = claimsByRestaurantTable.get(rid);
    if (!byTable) {
      byTable = new Map();
      claimsByRestaurantTable.set(rid, byTable);
    }
    const tid = String(claim.tableId);
    let set = byTable.get(tid);
    if (!set) {
      set = new Set();
      byTable.set(tid, set);
    }
    set.add(claim.slotKey);
  }

  for (const restaurant of restaurants) {
    const id = String(restaurant._id);
    const bounds = dayBounds.get(id)!;
    const restaurantShifts = (shiftsByRestaurant.get(id) ?? []).filter((s) =>
      (s.daysOfWeek ?? []).includes(bounds.dayOfWeek),
    );
    const slots = computeSlotsForRestaurant({
      restaurant,
      date: params.date,
      partySize: params.partySize,
      now,
      blackouts: blackoutsByRestaurant.get(id) ?? [],
      shifts: restaurantShifts,
      tables: tablesByRestaurant.get(id) ?? [],
      reservations: reservationsByRestaurant.get(id) ?? [],
      claimsByTable: claimsByRestaurantTable.get(id) ?? new Map(),
    });
    result.set(id, slots);
    if (useCache) {
      void setCachedAvailability(id, params.date, params.partySize, slots);
    }
  }

  return result;
}

export async function getAvailability(params: {
  restaurantId: string;
  date: string; // YYYY-MM-DD
  partySize: number;
  /** Injectable clock for tests; defaults to real now. */
  now?: Date;
}): Promise<AvailabilitySlot[]> {
  const map = await getAvailabilityForRestaurants({
    restaurantIds: [params.restaurantId],
    date: params.date,
    partySize: params.partySize,
    now: params.now,
  });
  return map.get(params.restaurantId) ?? [];
}

export async function findAvailableTable(params: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
  slotEnd: Date;
}) {
  const tables = await Table.find({
    restaurantId: params.restaurantId,
    active: true,
    minCapacity: { $lte: params.partySize },
    maxCapacity: { $gte: params.partySize },
  });

  const existing = await Reservation.find({
    restaurantId: params.restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    slotStart: { $lt: params.slotEnd },
    slotEnd: { $gt: params.slotStart },
  });

  const claimedIds = await findClaimedTableIds({
    restaurantId: params.restaurantId,
    slotStart: params.slotStart,
    slotEnd: params.slotEnd,
  });

  for (const table of tables) {
    if (claimedIds.has(String(table._id))) continue;
    const conflict = existing.some(
      (r) =>
        r.tableIds.some((id) => id.equals(table._id)) &&
        overlaps(params.slotStart, params.slotEnd, r.slotStart, r.slotEnd),
    );
    if (!conflict) return table;
  }
  return null;
}

type TurnTimeShift = {
  startTime: string;
  endTime: string;
  turnTimeMinutes?: number | null;
  daysOfWeek?: number[] | null;
};

/** Resolve turn time from an already-loaded shift list (floor ops / batch paths). */
export function turnTimeMinutesFromShifts(
  shifts: TurnTimeShift[],
  slotStart: Date,
  timeZone: string,
): number {
  const dayOfWeek = weekdayInTimeZone(slotStart, timeZone);
  const hm = hmInTimeZone(slotStart, timeZone);
  const shift = shifts.find(
    (s) =>
      (s.daysOfWeek == null || s.daysOfWeek.includes(dayOfWeek)) &&
      s.startTime <= hm &&
      hm < s.endTime,
  );
  return shift?.turnTimeMinutes ?? 90;
}

export async function getTurnTimeMinutes(restaurantId: string, slotStart: Date) {
  const restaurant = await Restaurant.findById(restaurantId).select('address location').lean();
  const timeZone = restaurantTimeZone(restaurant ?? {});
  const dayOfWeek = weekdayInTimeZone(slotStart, timeZone);
  const shifts = await Shift.find({
    restaurantId,
    active: true,
    daysOfWeek: dayOfWeek,
  })
    .select('startTime endTime turnTimeMinutes daysOfWeek')
    .lean();
  return turnTimeMinutesFromShifts(shifts, slotStart, timeZone);
}

/** First N open ISO slot times for discovery cards. */
export function previewAvailableSlotTimes(
  slots: AvailabilitySlot[],
  limit = 4,
): string[] {
  const out: string[] = [];
  for (const slot of slots) {
    if (!slot.available) continue;
    out.push(slot.time);
    if (out.length >= limit) break;
  }
  return out;
}
