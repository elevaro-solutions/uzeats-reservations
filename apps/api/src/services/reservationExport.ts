import {
  formatTimeInTimeZone,
  htmlToPlainText,
  isoDateInTimeZone,
  restaurantTimeZone,
} from '@reservations/shared';
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
  confirmationNumber?: string | null;
  restaurantId?: { toString(): string } | null;
  dinerId?: { toString(): string } | null;
  tableIds?: Array<{ toString(): string }> | null;
  partySize: number;
  status: string;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  landingPath?: string | null;
  originUrl?: string | null;
  referrer?: string | null;
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

function label(value?: string | null) {
  if (!value || value === 'none') return '';
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dollars(cents?: number | null) {
  return Math.round(cents ?? 0) / 100;
}

export function reservationExportTable(
  reservations: ReservationExportDoc[],
  dinersById: Map<
    string,
    { firstName: string; lastName?: string | null; email?: string | null; phone?: string | null }
  >,
  tableNameById: Map<string, string>,
  title: string,
  restaurantNameById?: Map<string, string>,
  timeZoneFor: (restaurantId: string) => string = () => PLATFORM_RESERVATION_LIST_TIMEZONE,
): ExportTable {
  const includeRestaurant = Boolean(restaurantNameById);
  const offset = includeRestaurant ? 1 : 0;
  const headers = [
    'Conf #',
    ...(includeRestaurant ? ['Restaurant'] : []),
    'Date',
    'Time',
    'Guest',
    'Phone',
    'Email',
    'Party size',
    'Status',
    'Table',
    'Source',
    'Occasion',
    'Ends',
    'Deposit ($)',
    'Deposit status',
    'Total spend ($)',
    'Experience',
    'Package',
    'Private dining',
    'Guest notes',
    'UTM source',
    'UTM medium',
    'UTM campaign',
    'Landing page',
    'Booking page URL',
    'Referrer',
    'Booked at (UTC)',
  ];
  // Conf #, (Restaurant), Date, Time, Guest, Phone, Party, Status, Table, Source.
  const pdfColumns = [
    0,
    ...(includeRestaurant ? [1] : []),
    1 + offset,
    2 + offset,
    3 + offset,
    4 + offset,
    6 + offset,
    7 + offset,
    8 + offset,
    9 + offset,
  ];
  return {
    title,
    headers,
    pdfColumns,
    rows: reservations.map((r) => {
      const diner = r.dinerId ? dinersById.get(r.dinerId.toString()) : undefined;
      const tables = (r.tableIds ?? [])
        .map((id) => tableNameById.get(id.toString()) ?? '')
        .filter(Boolean)
        .join(', ');
      const timeZone = timeZoneFor(r.restaurantId?.toString() ?? '');
      return [
        r.confirmationNumber || r._id.toString(),
        ...(includeRestaurant
          ? [restaurantNameById?.get(r.restaurantId?.toString() ?? '') ?? '']
          : []),
        r.slotStart ? isoDateInTimeZone(r.slotStart, timeZone) : '',
        formatTimeInTimeZone(r.slotStart, timeZone),
        guestLabel(diner),
        diner?.phone ?? '',
        diner?.email ?? '',
        r.partySize,
        label(r.status),
        tables,
        label(r.source),
        label(r.occasion),
        formatTimeInTimeZone(r.slotEnd, timeZone),
        dollars(r.depositAmountCents),
        label(r.depositStatus),
        dollars(r.totalSpendCents),
        r.experienceTitle ?? '',
        r.packageTitle ?? '',
        r.privateDiningSpaceName ?? '',
        htmlToPlainText(r.guestNotes ?? ''),
        r.utmSource ?? '',
        r.utmMedium ?? '',
        r.utmCampaign ?? '',
        r.landingPath ?? '',
        r.originUrl ?? '',
        r.referrer ?? '',
        iso(r.createdAt).replace('T', ' ').slice(0, 16),
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
  const zoneById = new Map<string, string>();

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
    if (ids.length) {
      const restaurants = await Restaurant.find({ _id: { $in: ids } }).select(
        'name address location',
      );
      restaurantNameById ??= new Map(restaurants.map((r) => [r._id.toString(), r.name ?? '']));
      for (const r of restaurants) zoneById.set(r._id.toString(), restaurantTimeZone(r));
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
      (restaurantId) => zoneById.get(restaurantId) ?? timeZone,
    ),
    args.format,
  );
}
