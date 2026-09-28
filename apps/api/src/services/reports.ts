import mongoose from 'mongoose';
import {
  addCalendarDays,
  calendarDateRange,
  calendarDayRange,
  isoDateInTimeZone,
  restaurantTimeZone,
  todayIsoInTimeZone,
  weekdayInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { Shift } from '../models/Shift.js';
import { User } from '../models/User.js';

async function loadRestaurantTimeZone(restaurantId: string): Promise<string> {
  const restaurant = await Restaurant.findById(restaurantId).select('address location').lean();
  return restaurantTimeZone(restaurant ?? {});
}

/** Restaurant-local day (or shift) window as exclusive-end UTC range. */
export function restaurantDayWindow(
  date: string,
  timeZone: string,
  shift?: { startTime: string; endTime: string } | null,
): { start: Date; end: Date } {
  if (shift?.startTime && shift?.endTime) {
    return {
      start: zonedWallClockToUtc(date, shift.startTime, timeZone),
      end: zonedWallClockToUtc(date, shift.endTime, timeZone),
    };
  }
  const { $gte, $lt } = calendarDayRange(date, timeZone);
  return { start: $gte, end: $lt };
}

/**
 * Pre-shift report: everything the floor team needs before service —
 * reservations in the shift window enriched with guest intelligence.
 */
export async function buildPreShiftReport(restaurantId: string, date: string, shiftId?: string) {
  const timeZone = await loadRestaurantTimeZone(restaurantId);

  let shiftName = 'All day';
  let shiftTimes: { startTime: string; endTime: string } | null = null;
  if (shiftId) {
    const shift = await Shift.findById(shiftId);
    if (shift) {
      shiftName = shift.name;
      shiftTimes = { startTime: shift.startTime, endTime: shift.endTime };
    }
  }

  const { start: windowStart, end: windowEnd } = restaurantDayWindow(date, timeZone, shiftTimes);

  const reservations = await Reservation.find({
    restaurantId,
    slotStart: { $gte: windowStart, $lt: windowEnd },
    status: { $in: ['pending', 'confirmed', 'seated'] },
  }).sort({ slotStart: 1 });

  const dinerIds = [...new Set(reservations.map((r) => r.dinerId.toString()))];
  const [profiles, diners] = await Promise.all([
    GuestProfile.find({ restaurantId, dinerId: { $in: dinerIds } }),
    User.find({ _id: { $in: dinerIds } }).select('firstName lastName phone'),
  ]);
  const profileByDiner = new Map(profiles.map((p) => [p.dinerId.toString(), p]));
  const dinerById = new Map(diners.map((d) => [d._id.toString(), d]));

  let totalCovers = 0;
  let vipCount = 0;
  const entries = reservations.map((r) => {
    totalCovers += r.partySize;
    const profile = profileByDiner.get(r.dinerId.toString());
    const diner = dinerById.get(r.dinerId.toString());
    const isVip = profile?.vipStatus === 'vip';
    if (isVip) vipCount++;
    return {
      reservationId: r._id.toString(),
      slotStart: r.slotStart,
      partySize: r.partySize,
      status: r.status,
      occasion: r.occasion,
      guestNotes: r.guestNotes ?? '',
      guestName: diner ? `${diner.firstName} ${diner.lastName}` : 'Guest',
      guestPhone: diner?.phone ?? null,
      vipStatus: profile?.vipStatus ?? 'none',
      tags: profile?.tags ?? [],
      totalVisits: profile?.totalVisits ?? 0,
      allergies: profile?.allergies ?? [],
      dietaryRestrictions: profile?.dietaryRestrictions ?? [],
      profileNotes: profile?.notes ?? '',
    };
  });

  const occasionCount = entries.filter((e) => e.occasion && e.occasion !== 'none').length;
  const allergyCount = entries.filter((e) => e.allergies.length > 0).length;

  return {
    date,
    shiftName,
    totalReservations: entries.length,
    totalCovers,
    vipCount,
    occasionCount,
    allergyCount,
    entries,
  };
}

/**
 * Revenue forecast: projects the next `days` from per-day-of-week averages
 * over the trailing 8 weeks of completed reservations.
 */
export async function buildRevenueForecast(restaurantId: string, days = 14) {
  const timeZone = await loadRestaurantTimeZone(restaurantId);
  const since = new Date(Date.now() - 56 * 86_400_000);
  const completed = await Reservation.find({
    restaurantId,
    status: 'completed',
    slotStart: { $gte: since },
  }).select('slotStart partySize totalSpendCents depositAmountCents');

  const byDow = new Map<number, { covers: number; revenueCents: number; daysSeen: Set<string> }>();
  for (let d = 0; d < 7; d++) byDow.set(d, { covers: 0, revenueCents: 0, daysSeen: new Set() });

  for (const r of completed) {
    const dow = weekdayInTimeZone(r.slotStart, timeZone);
    const bucket = byDow.get(dow)!;
    bucket.covers += r.partySize;
    bucket.revenueCents += r.totalSpendCents || r.depositAmountCents || 0;
    bucket.daysSeen.add(isoDateInTimeZone(r.slotStart, timeZone));
  }

  const today = todayIsoInTimeZone(timeZone);
  const points = [];
  for (let i = 1; i <= days; i++) {
    const dateIso = addCalendarDays(today, i);
    const noon = zonedWallClockToUtc(dateIso, '12:00', timeZone);
    const dow = weekdayInTimeZone(noon, timeZone);
    const bucket = byDow.get(dow)!;
    const sampleDays = Math.max(1, bucket.daysSeen.size);
    points.push({
      date: dateIso,
      projectedCovers: Math.round(bucket.covers / sampleDays),
      projectedRevenueCents: Math.round(bucket.revenueCents / sampleDays),
    });
  }

  const totalProjectedCovers = points.reduce((s, p) => s + p.projectedCovers, 0);
  const totalProjectedRevenueCents = points.reduce((s, p) => s + p.projectedRevenueCents, 0);

  return { points, totalProjectedCovers, totalProjectedRevenueCents, basedOnReservations: completed.length };
}

const REPORT_METRICS = ['reservations', 'covers', 'revenueCents', 'noShows', 'cancellations'] as const;
export type ReportMetric = (typeof REPORT_METRICS)[number];

/**
 * Custom report builder: pick metrics, a grouping dimension, and a date
 * range; returns tabular rows.
 */
export async function buildCustomReport(input: {
  restaurantId: string;
  metrics: string[];
  groupBy: 'day' | 'week' | 'month' | 'source' | 'status' | 'occasion';
  startDate: string;
  endDate: string;
}) {
  const metrics = input.metrics.filter((m): m is ReportMetric =>
    (REPORT_METRICS as readonly string[]).includes(m),
  );
  if (metrics.length === 0) throw new Error('Select at least one valid metric');

  const timeZone = await loadRestaurantTimeZone(input.restaurantId);
  const { $gte: start, $lt: end } = calendarDateRange(input.startDate, input.endDate, timeZone);

  const groupExpr: Record<string, unknown> = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$slotStart', timezone: timeZone } },
    week: { $dateToString: { format: '%G-W%V', date: '$slotStart', timezone: timeZone } },
    month: { $dateToString: { format: '%Y-%m', date: '$slotStart', timezone: timeZone } },
    source: '$source',
    status: '$status',
    occasion: '$occasion',
  };

  const rows = await Reservation.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(input.restaurantId),
        slotStart: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: groupExpr[input.groupBy],
        reservations: { $sum: 1 },
        covers: { $sum: '$partySize' },
        revenueCents: { $sum: { $ifNull: ['$totalSpendCents', 0] } },
        noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        cancellations: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    group: String(row._id ?? 'unknown'),
    values: metrics.map((m) => ({ metric: m, value: row[m] ?? 0 })),
  }));
}

/** Multi-location rollup across every restaurant the owner can access. */
export async function buildMultiLocationAnalytics(restaurantIds: string[], period?: string) {
  const filter: Record<string, unknown> = {
    restaurantId: { $in: restaurantIds.map((id) => new mongoose.Types.ObjectId(id)) },
  };
  if (period) {
    const start = new Date(`${period}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    filter.slotStart = { $gte: start, $lt: end };
  }

  const [rows, restaurants] = await Promise.all([
    Reservation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$restaurantId',
          reservations: { $sum: 1 },
          covers: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'seated', 'completed']] },
                '$partySize',
                0,
              ],
            },
          },
          revenueCents: { $sum: { $ifNull: ['$totalSpendCents', 0] } },
          noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          cancellations: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
    ]),
    Restaurant.find({ _id: { $in: restaurantIds } }),
  ]);

  const statsById = new Map(rows.map((r) => [r._id.toString(), r]));
  const locations = restaurants.map((rest) => {
    const stats = statsById.get(rest._id.toString());
    return {
      restaurant: rest,
      reservations: stats?.reservations ?? 0,
      covers: stats?.covers ?? 0,
      revenueCents: stats?.revenueCents ?? 0,
      noShows: stats?.noShows ?? 0,
      cancellations: stats?.cancellations ?? 0,
      averageRating: rest.averageRating ?? 0,
    };
  });

  return {
    totalReservations: locations.reduce((s, l) => s + l.reservations, 0),
    totalCovers: locations.reduce((s, l) => s + l.covers, 0),
    totalRevenueCents: locations.reduce((s, l) => s + l.revenueCents, 0),
    locations,
  };
}
