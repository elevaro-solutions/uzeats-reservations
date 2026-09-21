import { isMongoObjectId, restaurantTimeZone } from '@reservations/shared';
import mongoose from 'mongoose';
import { mapReservation } from '../graphql/mappers.js';
import { paginateQuery } from '../lib/pagination.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import {
  calendarDayRange,
  isReservationDatePeriod,
  parseIsoDate,
  PLATFORM_RESERVATION_LIST_TIMEZONE,
  reservationPeriodSlotRange,
} from './reservationListFilter.js';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EMPTY_OBJECT_ID = new mongoose.Types.ObjectId('000000000000000000000000');

export async function listAdminReservations(args: {
  restaurantId?: string;
  status?: string;
  period?: string;
  date?: string;
  search?: string;
  source?: string;
  limit?: number;
  offset?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (args.restaurantId) filter.restaurantId = args.restaurantId;
  if (args.status) filter.status = args.status;
  if (args.source) filter.source = args.source;

  let timeZone = PLATFORM_RESERVATION_LIST_TIMEZONE;
  if (args.restaurantId) {
    const restaurant = await Restaurant.findById(args.restaurantId);
    timeZone = restaurantTimeZone(restaurant ?? {});
  }

  const period = isReservationDatePeriod(args.period) ? args.period : undefined;
  if (period && period !== 'all') {
    const range = reservationPeriodSlotRange(period, timeZone);
    if (range) filter.slotStart = range;
  } else {
    const date = parseIsoDate(args.date);
    if (date) filter.slotStart = calendarDayRange(date, timeZone);
  }

  const q = args.search?.trim();
  if (q) {
    const or: Record<string, unknown>[] = [];
    if (isMongoObjectId(q)) {
      or.push({ _id: q }, { dinerId: q }, { restaurantId: q });
    }

    const regex = new RegExp(escapeRegex(q), 'i');
    const dinerClauses: Record<string, unknown>[] = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      dinerClauses.push({
        firstName: new RegExp(escapeRegex(tokens[0]!), 'i'),
        lastName: new RegExp(escapeRegex(tokens.slice(1).join(' ')), 'i'),
      });
    }

    const [diners, restaurants] = await Promise.all([
      User.find({ $or: dinerClauses }).select('_id').limit(100),
      Restaurant.find({ name: regex }).select('_id').limit(100),
    ]);
    if (diners.length) or.push({ dinerId: { $in: diners.map((d) => d._id) } });
    if (restaurants.length) or.push({ restaurantId: { $in: restaurants.map((r) => r._id) } });

    if (!or.length) filter._id = EMPTY_OBJECT_ID;
    else filter.$or = or;
  }

  const newestFirst = !period || period === 'past' || period === 'all';
  return paginateQuery(Reservation, filter, {
    sort: { slotStart: newestFirst ? -1 : 1 },
    limit: args.limit,
    offset: args.offset,
    defaultLimit: 20,
    maxLimit: 100,
    map: mapReservation,
  });
}
