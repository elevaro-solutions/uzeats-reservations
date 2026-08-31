import type { Types } from 'mongoose';
import { Notification, Reservation, Restaurant, Shift, Table, WaitlistEntry } from '../models/index.js';
import { buildOwnerRestaurantFilter } from './restaurantFilters.js';

export type OwnerLocationOverview = {
  restaurantId: string;
  name: string;
  status: string;
  cuisine: string;
  city: string;
  state: string;
  averageRating: number;
  reviewCount: number;
  todayReservations: number;
  todayCovers: number;
  openWaitlist: number;
  tableCount: number;
  shiftCount: number;
};

export type OwnerOverviewStats = {
  locationsTotal: number;
  locationsActive: number;
  locationsPending: number;
  locationsInactive: number;
  todayReservations: number;
  todayCovers: number;
  openWaitlist: number;
  unreadNotifications: number;
  averageRating: number;
  reviewCount: number;
  locations: OwnerLocationOverview[];
};

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  return { start, end };
}

function emptyOverview(unreadNotifications = 0): OwnerOverviewStats {
  return {
    locationsTotal: 0,
    locationsActive: 0,
    locationsPending: 0,
    locationsInactive: 0,
    todayReservations: 0,
    todayCovers: 0,
    openWaitlist: 0,
    unreadNotifications,
    averageRating: 0,
    reviewCount: 0,
    locations: [],
  };
}

export async function buildOwnerOverview(
  user: { _id: Types.ObjectId; restaurantIds: Types.ObjectId[] },
  date: string,
): Promise<OwnerOverviewStats> {
  const baseFilter = buildOwnerRestaurantFilter(user);
  const restaurants = await Restaurant.find(baseFilter)
    .select('_id name status cuisine address averageRating reviewCount')
    .sort({ name: 1 })
    .lean();

  if (restaurants.length === 0) {
    const unreadNotifications = await Notification.countDocuments({
      userId: user._id,
      channel: 'in_app',
      $or: [{ readAt: null }, { readAt: { $exists: false } }],
    });
    return emptyOverview(unreadNotifications);
  }

  const ids = restaurants.map((r) => r._id);
  let locationsActive = 0;
  let locationsPending = 0;
  let locationsInactive = 0;
  let ratingWeight = 0;
  let reviewCount = 0;

  for (const r of restaurants) {
    if (r.status === 'approved') locationsActive += 1;
    else if (r.status === 'pending') locationsPending += 1;
    else if (r.status === 'rejected' || r.status === 'suspended') locationsInactive += 1;

    const reviews = Number(r.reviewCount ?? 0);
    const rating = Number(r.averageRating ?? 0);
    if (reviews > 0 && rating > 0) {
      ratingWeight += rating * reviews;
      reviewCount += reviews;
    } else if (reviews > 0) {
      reviewCount += reviews;
    }
  }

  const { start, end } = dayBounds(date);

  const [todayRows, waitlistRows, tableRows, shiftRows, unreadNotifications] = await Promise.all([
    Reservation.aggregate<{
      _id: Types.ObjectId;
      reservations: number;
      covers: number;
    }>([
      {
        $match: {
          restaurantId: { $in: ids },
          slotStart: { $gte: start, $lte: end },
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: '$restaurantId',
          reservations: { $sum: 1 },
          covers: { $sum: '$partySize' },
        },
      },
    ]),
    WaitlistEntry.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          restaurantId: { $in: ids },
          status: { $in: ['waiting', 'notified'] },
        },
      },
      { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
    ]),
    Table.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { restaurantId: { $in: ids } } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
    ]),
    Shift.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { restaurantId: { $in: ids } } },
      { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
    ]),
    Notification.countDocuments({
      userId: user._id,
      channel: 'in_app',
      $or: [{ readAt: null }, { readAt: { $exists: false } }],
    }),
  ]);

  const todayById = new Map(todayRows.map((row) => [row._id.toString(), row]));
  const waitlistById = new Map(waitlistRows.map((row) => [row._id.toString(), row.count]));
  const tablesById = new Map(tableRows.map((row) => [row._id.toString(), row.count]));
  const shiftsById = new Map(shiftRows.map((row) => [row._id.toString(), row.count]));

  const locations: OwnerLocationOverview[] = restaurants.map((r) => {
    const id = r._id.toString();
    const today = todayById.get(id);
    return {
      restaurantId: id,
      name: r.name,
      status: r.status,
      cuisine: r.cuisine ?? '',
      city: r.address?.city ?? '',
      state: r.address?.state ?? '',
      averageRating: Number(r.averageRating ?? 0),
      reviewCount: Number(r.reviewCount ?? 0),
      todayReservations: today?.reservations ?? 0,
      todayCovers: today?.covers ?? 0,
      openWaitlist: waitlistById.get(id) ?? 0,
      tableCount: tablesById.get(id) ?? 0,
      shiftCount: shiftsById.get(id) ?? 0,
    };
  });

  return {
    locationsTotal: restaurants.length,
    locationsActive,
    locationsPending,
    locationsInactive,
    todayReservations: locations.reduce((sum, loc) => sum + loc.todayReservations, 0),
    todayCovers: locations.reduce((sum, loc) => sum + loc.todayCovers, 0),
    openWaitlist: locations.reduce((sum, loc) => sum + loc.openWaitlist, 0),
    unreadNotifications,
    averageRating: reviewCount > 0 ? Math.round((ratingWeight / reviewCount) * 10) / 10 : 0,
    reviewCount,
    locations,
  };
}
