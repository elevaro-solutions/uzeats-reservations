import DataLoader from 'dataloader';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { Table } from '../models/Table.js';
import { Shift } from '../models/Shift.js';
import { Menu } from '../models/Menu.js';
import { Experience } from '../models/Experience.js';
import { Reservation } from '../models/Reservation.js';
import { RestaurantBookmark, type RestaurantBookmarkKind } from '../models/RestaurantBookmark.js';
import { getBookingWindow } from '../services/accessRules.js';
import {
  mapRestaurant,
  mapUser,
  mapTable,
  mapShift,
  mapMenu,
  mapExperience,
  mapReservation,
} from './mappers.js';

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function orderByKeys<T>(
  keys: readonly string[],
  docs: Array<{ id: string } & T>,
): Array<({ id: string } & T) | null> {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return keys.map((k) => byId.get(k) ?? null);
}

type MappedShift = ReturnType<typeof mapShift>;
type MappedMenu = ReturnType<typeof mapMenu>;
type MappedBookingWindow = Awaited<ReturnType<typeof getBookingWindow>>;

export type GraphQLLoaders = {
  restaurantById: DataLoader<string, ReturnType<typeof mapRestaurant> | null>;
  userById: DataLoader<string, ReturnType<typeof mapUser> | null>;
  tableById: DataLoader<string, ReturnType<typeof mapTable> | null>;
  bookmark: DataLoader<string, boolean>;
  shiftsByRestaurantId: DataLoader<string, MappedShift[]>;
  menuByRestaurantId: DataLoader<string, MappedMenu | null>;
  bookingWindowByRestaurantId: DataLoader<string, MappedBookingWindow>;
  experienceById: DataLoader<string, ReturnType<typeof mapExperience> | null>;
  reservationById: DataLoader<string, ReturnType<typeof mapReservation> | null>;
};

function bookmarkKey(restaurantId: string, kind: RestaurantBookmarkKind) {
  return `${kind}:${restaurantId}`;
}

export function createLoaders(userId: string | null): GraphQLLoaders {
  const restaurantById = new DataLoader<string, ReturnType<typeof mapRestaurant> | null>(
    async (ids) => {
      const objectIds = ids.map(toObjectId).filter((id): id is mongoose.Types.ObjectId => !!id);
      const docs = await Restaurant.find({ _id: { $in: objectIds } });
      const mapped = docs.map(mapRestaurant);
      return orderByKeys(ids, mapped);
    },
  );

  const userById = new DataLoader<string, ReturnType<typeof mapUser> | null>(async (ids) => {
    const objectIds = ids.map(toObjectId).filter((id): id is mongoose.Types.ObjectId => !!id);
    const docs = await User.find({ _id: { $in: objectIds } });
    const mapped = docs.map(mapUser);
    return orderByKeys(ids, mapped);
  });

  const tableById = new DataLoader<string, ReturnType<typeof mapTable> | null>(async (ids) => {
    const objectIds = ids.map(toObjectId).filter((id): id is mongoose.Types.ObjectId => !!id);
    const docs = await Table.find({ _id: { $in: objectIds } });
    const mapped = docs.map(mapTable);
    return orderByKeys(ids, mapped);
  });

  const bookmark = new DataLoader<string, boolean>(async (keys) => {
    if (!userId) return keys.map(() => false);
    const parsed = keys.map((key) => {
      const [kind, restaurantId] = key.split(':') as [RestaurantBookmarkKind, string];
      return { kind, restaurantId };
    });
    const restaurantIds = [...new Set(parsed.map((p) => p.restaurantId))];
    const docs = await RestaurantBookmark.find({
      userId,
      restaurantId: { $in: restaurantIds },
    }).select('restaurantId kind');
    const set = new Set(docs.map((d) => bookmarkKey(String(d.restaurantId), d.kind)));
    return keys.map((key) => set.has(key));
  });

  const shiftsByRestaurantId = new DataLoader<string, MappedShift[]>(async (restaurantIds) => {
    const docs = await Shift.find({ restaurantId: { $in: [...restaurantIds] } });
    const byRestaurant = new Map<string, MappedShift[]>();
    for (const id of restaurantIds) byRestaurant.set(id, []);
    for (const doc of docs) {
      const rid = String(doc.restaurantId);
      const list = byRestaurant.get(rid);
      if (list) list.push(mapShift(doc));
    }
    return restaurantIds.map((id) => byRestaurant.get(id) ?? []);
  });

  const menuByRestaurantId = new DataLoader<string, MappedMenu | null>(async (restaurantIds) => {
    const docs = await Menu.find({ restaurantId: { $in: [...restaurantIds] } });
    const byRestaurant = new Map<string, MappedMenu>();
    for (const doc of docs) {
      byRestaurant.set(String(doc.restaurantId), mapMenu(doc, String(doc.restaurantId)));
    }
    return restaurantIds.map((id) => byRestaurant.get(id) ?? null);
  });

  const bookingWindowByRestaurantId = new DataLoader<string, MappedBookingWindow>(
    async (restaurantIds) =>
      Promise.all(restaurantIds.map((id) => getBookingWindow(id))),
  );

  const experienceById = new DataLoader<string, ReturnType<typeof mapExperience> | null>(
    async (ids) => {
      const objectIds = ids.map(toObjectId).filter((id): id is mongoose.Types.ObjectId => !!id);
      const docs = await Experience.find({ _id: { $in: objectIds } });
      const mapped = docs.map(mapExperience);
      return orderByKeys(ids, mapped);
    },
  );

  const reservationById = new DataLoader<string, ReturnType<typeof mapReservation> | null>(
    async (ids) => {
      const objectIds = ids.map(toObjectId).filter((id): id is mongoose.Types.ObjectId => !!id);
      const docs = await Reservation.find({ _id: { $in: objectIds } });
      const mapped = docs.map((d) => mapReservation(d));
      return orderByKeys(ids, mapped);
    },
  );

  return {
    restaurantById,
    userById,
    tableById,
    bookmark,
    shiftsByRestaurantId,
    menuByRestaurantId,
    bookingWindowByRestaurantId,
    experienceById,
    reservationById,
  };
}

export { bookmarkKey };
