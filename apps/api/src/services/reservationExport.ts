import { restaurantTimeZone } from '@reservations/shared';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { Table } from '../models/Table.js';
import { User } from '../models/User.js';
import {
  formatExport,
  iso,
  type ExportFormat,
  type ExportPayload,
  type ExportTable,
} from './adminExport.js';
import { LIST_EXPORT_LIMIT } from './guestDinerExport.js';
import {
  isReservationDatePeriod,
  PLATFORM_RESERVATION_LIST_TIMEZONE,
  resolveReservationSlotStartFilter,
} from './reservationListFilter.js';

type ReservationExportDoc = {
  _id: { toString(): string };
  restaurantId?: { toString(): string } | null;
  dinerId?: { toString(): string } | null;
  tableIds?: Array<{ toString(): string }> | null;
  partySize: number;
  status: string;
  source?: string | null;
  occasion?: string | null;
  guestNotes?: string | null;
  slotStart?: Date | null;
  slotEnd?: Date | null;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  experienceTitle?: string | null;
  packageTitle?: string | null;
  privateDiningSpaceName?: string | null;
  totalSpendCents?: number | null;
  createdAt?: Date;
};

function guestLabel(diner?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  const name = [diner?.firstName, diner?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Guest';
}

export function reservationExportTable(
  reservations: ReservationExportDoc[],
  dinersById: Map<
    string,
    { firstName: string; lastName: string; email?: string | null; phone?: string | null }
  >,
  tableNameById: Map<string, string>,
  title: string,
  restaurantNameById?: Map<string, string>,
): ExportTable {
  const includeRestaurant = Boolean(restaurantNameById);
  return {
    title,
    headers: [
      'id',
      ...(includeRestaurant ? ['restaurant'] : []),
      'guestName',
      'guestPhone',
      'guestEmail',
      'partySize',
      'status',
      'source',
      'occasion',
      'slotStart',
      'slotEnd',
      'tables',
      'depositAmountCents',
      'depositStatus',
      'totalSpendCents',
      'experienceTitle',
      'packageTitle',
      'privateDiningSpaceName',
      'guestNotes',
      'createdAt',
    ],
    rows: reservations.map((r) => {
      const diner = r.dinerId ? dinersById.get(r.dinerId.toString()) : undefined;
      const tables = (r.tableIds ?? [])
        .map((id) => tableNameById.get(id.toString()) ?? id.toString())
        .join(', ');
      return [
        r._id.toString(),
        ...(includeRestaurant
          ? [
              restaurantNameById?.get(r.restaurantId?.toString() ?? '') ?? '',
            ]
          : []),
        guestLabel(diner),
        diner?.phone ?? '',
        diner?.email ?? '',
        r.partySize,
        r.status,
        r.source ?? '',
        r.occasion ?? '',
        iso(r.slotStart),
        iso(r.slotEnd),
        tables,
        r.depositAmountCents ?? 0,
        r.depositStatus ?? '',
        r.totalSpendCents ?? 0,
        r.experienceTitle ?? '',
        r.packageTitle ?? '',
        r.privateDiningSpaceName ?? '',
        r.guestNotes ?? '',
        iso(r.createdAt),
      ];
    }),
  };
}

export async function exportRestaurantReservationsList(args: {
  restaurantId?: string;
  restaurantIds?: string[];
  restaurantName?: string;
  restaurantNameById?: Map<string, string>;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  period?: string | null;
  status?: string | null;
  format: ExportFormat;
}): Promise<ExportPayload> {
  const filter: Record<string, unknown> = {};
  let timeZone = PLATFORM_RESERVATION_LIST_TIMEZONE;
  let venueLabel = 'All locations';
  let basename = 'reservations-all';
  let restaurantNameById = args.restaurantNameById;

  if (args.restaurantId) {
    const restaurant = await Restaurant.findById(args.restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');
    timeZone = restaurantTimeZone(restaurant);
    filter.restaurantId = args.restaurantId;
    venueLabel = args.restaurantName ?? restaurant.name ?? 'Restaurant';
    basename = `reservations-${args.restaurantId}`;
  } else {
    const ids = args.restaurantIds ?? [];
    filter.restaurantId = { $in: ids };
    if (!restaurantNameById && ids.length) {
      const restaurants = await Restaurant.find({ _id: { $in: ids } }).select('name');
      restaurantNameById = new Map(
        restaurants.map((r) => [r._id.toString(), r.name ?? '']),
      );
    }
  }

  if (args.status) filter.status = args.status;

  const slotStart = resolveReservationSlotStartFilter(
    {
      period: args.period,
      date: args.date,
      startDate: args.startDate,
      endDate: args.endDate,
    },
    timeZone,
  );
  if (slotStart) filter.slotStart = slotStart;

  const period = isReservationDatePeriod(args.period) ? args.period : undefined;
  const newestFirst = period === 'past' || period === 'all';

  const reservations = (await Reservation.find(filter)
    .sort({ slotStart: newestFirst ? -1 : 1 })
    .limit(LIST_EXPORT_LIMIT)
    .lean()) as ReservationExportDoc[];

  const dinerIds = [
    ...new Set(
      reservations
        .map((r) => r.dinerId?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const tableIds = [
    ...new Set(
      reservations.flatMap((r) => (r.tableIds ?? []).map((id) => id.toString())),
    ),
  ];

  const [diners, tables] = await Promise.all([
    dinerIds.length
      ? User.find({ _id: { $in: dinerIds } }).select('firstName lastName email phone')
      : Promise.resolve([]),
    tableIds.length
      ? Table.find({ _id: { $in: tableIds } }).select('name')
      : Promise.resolve([]),
  ]);

  const dinersById = new Map(
    diners.map((u) => [
      u._id.toString(),
      {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
      },
    ]),
  );
  const tableNameById = new Map(tables.map((t) => [t._id.toString(), t.name]));

  const rangeLabel = (() => {
    if (period && period !== 'all') return period;
    if (args.startDate && args.endDate) {
      return args.startDate === args.endDate
        ? args.startDate
        : `${args.startDate}_to_${args.endDate}`;
    }
    if (args.date) return args.date;
    return 'all';
  })();

  return formatExport(
    `${basename}-${rangeLabel}`,
    reservationExportTable(
      reservations,
      dinersById,
      tableNameById,
      `Reservations — ${venueLabel} (${rangeLabel})`,
      args.restaurantId ? undefined : restaurantNameById,
    ),
    args.format,
  );
}
