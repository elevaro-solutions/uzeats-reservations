import { User } from '../models/User.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { Restaurant } from '../models/Restaurant.js';
import { formatExport, iso, type ExportFormat, type ExportPayload, type ExportTable } from './adminExport.js';

export const LIST_EXPORT_LIMIT = 5000;

function searchRegex(search: string) {
  return new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export function dinerAccountFilter(search?: string | null) {
  const filter: Record<string, unknown> = { role: 'diner' };
  if (search?.trim()) {
    const regex = searchRegex(search);
    filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }, { phone: regex }];
  }
  return filter;
}

export function dinerExportTable(users: Array<{
  _id: { toString(): string };
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  loyaltyPoints?: number | null;
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  createdAt?: Date;
}>): ExportTable {
  return {
    title: 'Diners',
    headers: [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'loyaltyPoints',
      'emailVerified',
      'phoneVerified',
      'createdAt',
    ],
    rows: users.map((u) => [
      u._id.toString(),
      u.firstName,
      u.lastName,
      u.email ?? '',
      u.phone ?? '',
      u.loyaltyPoints ?? 0,
      Boolean(u.emailVerified),
      Boolean(u.phoneVerified),
      iso(u.createdAt),
    ]),
  };
}

export async function guestListFilter(args: {
  restaurantId?: string;
  tag?: string | null;
  vipStatus?: string | null;
  search?: string | null;
  createdAt?: Record<string, Date>;
}) {
  const filter: Record<string, unknown> = {};
  if (args.restaurantId) filter.restaurantId = args.restaurantId;
  if (args.tag) filter.tags = args.tag;
  if (args.vipStatus) filter.vipStatus = args.vipStatus;
  if (args.createdAt) filter.createdAt = args.createdAt;
  if (args.search?.trim()) {
    const regex = searchRegex(args.search);
    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
    }).select('_id');
    filter.dinerId = { $in: matchingUsers.map((u) => u._id) };
  }
  return filter;
}

type GuestExportDoc = {
  _id: { toString(): string };
  restaurantId: { toString(): string };
  dinerId: { toString(): string };
  tags?: string[] | null;
  notes?: string | null;
  vipStatus?: string | null;
  totalVisits?: number | null;
  loyaltyPoints?: number | null;
  totalSpendCents?: number | null;
  averagePartySize?: number | null;
  lastVisitDate?: Date | null;
  preferredTable?: string | null;
  dietaryRestrictions?: string[] | null;
  allergies?: string[] | null;
  occasions?: string[] | null;
  createdAt?: Date;
};

export function guestExportTable(
  guests: GuestExportDoc[],
  dinersById: Map<string, { firstName: string; lastName: string; email?: string | null; phone?: string | null }>,
  restaurantNameById?: Map<string, string>,
  title = 'Guests',
): ExportTable {
  const includeRestaurant = Boolean(restaurantNameById);
  return {
    title,
    headers: [
      ...(includeRestaurant ? ['restaurant'] : []),
      'dinerId',
      'firstName',
      'lastName',
      'email',
      'phone',
      'vipStatus',
      'tags',
      'totalVisits',
      'loyaltyPoints',
      'totalSpendCents',
      'averagePartySize',
      'lastVisitDate',
      'preferredTable',
      'dietaryRestrictions',
      'allergies',
      'occasions',
      'notes',
    ],
    rows: guests.map((g) => {
      const diner = dinersById.get(g.dinerId.toString());
      const cells: unknown[] = [
        g.dinerId.toString(),
        diner?.firstName ?? '',
        diner?.lastName ?? '',
        diner?.email ?? '',
        diner?.phone ?? '',
        g.vipStatus ?? 'none',
        (g.tags ?? []).join('; '),
        g.totalVisits ?? 0,
        g.loyaltyPoints ?? 0,
        g.totalSpendCents ?? 0,
        g.averagePartySize ?? 0,
        iso(g.lastVisitDate),
        g.preferredTable ?? '',
        (g.dietaryRestrictions ?? []).join('; '),
        (g.allergies ?? []).join('; '),
        (g.occasions ?? []).join('; '),
        g.notes ?? '',
      ];
      if (includeRestaurant) {
        cells.unshift(restaurantNameById?.get(g.restaurantId.toString()) ?? '');
      }
      return cells;
    }),
  };
}

export async function loadGuestExportLookups(guests: GuestExportDoc[], withRestaurants: boolean) {
  const dinerIds = [...new Set(guests.map((g) => g.dinerId.toString()))];
  const diners = await User.find({ _id: { $in: dinerIds } }).select(
    'firstName lastName email phone',
  );
  const dinersById = new Map(
    diners.map((u) => [
      u._id.toString(),
      {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email ?? null,
        phone: u.phone ?? null,
      },
    ]),
  );

  let restaurantNameById: Map<string, string> | undefined;
  if (withRestaurants) {
    const restaurantIds = [...new Set(guests.map((g) => g.restaurantId.toString()))];
    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select('name');
    restaurantNameById = new Map(restaurants.map((r) => [r._id.toString(), r.name]));
  }

  return { dinersById, restaurantNameById };
}

export async function exportDinersList(args: {
  search?: string | null;
  format: ExportFormat;
}): Promise<ExportPayload> {
  const users = await User.find(dinerAccountFilter(args.search))
    .sort({ createdAt: -1 })
    .limit(LIST_EXPORT_LIMIT);
  const table = dinerExportTable(users);
  table.title = args.search?.trim() ? `Diners (${args.search.trim()})` : 'Diners';
  return formatExport('diners', table, args.format);
}

export async function exportGuestsList(args: {
  restaurantId?: string;
  restaurantName?: string;
  tag?: string | null;
  vipStatus?: string | null;
  search?: string | null;
  createdAt?: Record<string, Date>;
  rangeLabel?: string;
  format: ExportFormat;
}): Promise<ExportPayload> {
  const filter = await guestListFilter(args);
  const guests = await GuestProfile.find(filter)
    .sort({ lastVisitDate: -1, createdAt: -1 })
    .limit(LIST_EXPORT_LIMIT);
  const { dinersById, restaurantNameById } = await loadGuestExportLookups(
    guests,
    !args.restaurantId,
  );
  const label =
    args.restaurantName ??
    (args.rangeLabel ? `Guests (${args.rangeLabel})` : 'Guests');
  const basename = args.restaurantId
    ? `guests-${args.restaurantId}`
    : `guests-${args.rangeLabel ?? 'all'}`;
  return formatExport(
    basename,
    guestExportTable(guests, dinersById, restaurantNameById, label),
    args.format,
  );
}
