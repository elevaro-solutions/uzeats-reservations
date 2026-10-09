import { restaurantTimeZone } from '@reservations/shared';
import { mapReservation } from '../graphql/mappers.js';
import { paginateQuery } from '../lib/pagination.js';
import {
  buildReservationSearchOr,
  EMPTY_RESERVATION_SEARCH_ID,
  isReservationConfirmationLookup,
} from '../lib/reservationListSearch.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import {
  isReservationDatePeriod,
  PLATFORM_RESERVATION_LIST_TIMEZONE,
  resolveReservationSlotStartFilter,
} from './reservationListFilter.js';

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

  const q = args.search?.trim() ?? '';
  const confirmationLookup = isReservationConfirmationLookup(q);

  const period = isReservationDatePeriod(args.period) ? args.period : undefined;
  // Exact confirmation # lookup ignores date period so staff can find any booking quickly.
  if (!confirmationLookup) {
    const slotStart = resolveReservationSlotStartFilter(
      { period: args.period, date: args.date },
      timeZone,
    );
    if (slotStart) filter.slotStart = slotStart;
  }

  if (q) {
    const or = await buildReservationSearchOr(q, { includeRestaurantName: true });
    if (!or?.length) filter._id = EMPTY_RESERVATION_SEARCH_ID;
    else filter.$or = or;
  }

  const newestFirst = !period || period === 'past' || period === 'all';
  return paginateQuery(Reservation, filter, {
    sort: newestFirst ? { slotStart: -1, _id: -1 } : { slotStart: 1, _id: 1 },
    limit: args.limit,
    offset: args.offset,
    defaultLimit: 20,
    maxLimit: 100,
    map: mapReservation,
  });
}
