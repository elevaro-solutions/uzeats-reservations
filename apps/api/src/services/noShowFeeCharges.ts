import mongoose from 'mongoose';
import {
  calendarDayRange,
  isMongoObjectId,
  restaurantTimeZone,
} from '@reservations/shared';
import { mapReservation } from '../graphql/mappers.js';
import { paginateQuery } from '../lib/pagination.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { PLATFORM_RESERVATION_LIST_TIMEZONE } from './reservationListFilter.js';

export const NO_SHOW_FEE_STATUSES = ['charged', 'refunded', 'failed', 'pending'] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EMPTY_OBJECT_ID = new mongoose.Types.ObjectId('000000000000000000000000');

/** Bookings that have (or need) a collected card-guarantee fee. */
export function noShowFeeActivityClause(
  feeStatus?: string | null,
  opts?: { chargedAtOnly?: boolean },
): Record<string, unknown> {
  switch (feeStatus) {
    case 'charged':
      return { cardGuaranteeStatus: 'charged', noShowFeeCents: { $gt: 0 } };
    case 'refunded':
      return { cardGuaranteeStatus: 'refunded', noShowFeeCents: { $gt: 0 } };
    case 'failed':
      return { cardGuaranteeStatus: 'failed', noShowFeeCents: { $gt: 0 } };
    case 'pending':
      return {
        status: 'no_show',
        cardGuaranteeStatus: 'card_saved',
        noShowFeeCents: { $gt: 0 },
      };
    default:
      if (opts?.chargedAtOnly) {
        return {
          cardGuaranteeStatus: { $in: ['charged', 'refunded', 'failed'] },
          noShowFeeCents: { $gt: 0 },
        };
      }
      return {
        noShowFeeCents: { $gt: 0 },
        $or: [
          { cardGuaranteeStatus: { $in: ['charged', 'refunded', 'failed'] } },
          { status: 'no_show', cardGuaranteeStatus: 'card_saved' },
        ],
      };
  }
}

function andClauses(...parts: Array<Record<string, unknown> | null | undefined>) {
  const clauses = parts.filter((p): p is Record<string, unknown> => Boolean(p && Object.keys(p).length));
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { $and: clauses };
}

export async function summarizeNoShowFeeCharges(baseFilter: Record<string, unknown>) {
  const [charged, refunded, failed, pending] = await Promise.all([
    Reservation.aggregate([
      { $match: andClauses(baseFilter, { cardGuaranteeStatus: 'charged', noShowFeeCents: { $gt: 0 } }) },
      { $group: { _id: null, count: { $sum: 1 }, totalCents: { $sum: '$noShowFeeCents' } } },
    ]),
    Reservation.aggregate([
      { $match: andClauses(baseFilter, { cardGuaranteeStatus: 'refunded', noShowFeeCents: { $gt: 0 } }) },
      { $group: { _id: null, count: { $sum: 1 }, totalCents: { $sum: '$noShowFeeCents' } } },
    ]),
    Reservation.aggregate([
      { $match: andClauses(baseFilter, { cardGuaranteeStatus: 'failed', noShowFeeCents: { $gt: 0 } }) },
      { $group: { _id: null, count: { $sum: 1 }, totalCents: { $sum: '$noShowFeeCents' } } },
    ]),
    Reservation.aggregate([
      {
        $match: andClauses(baseFilter, {
          status: 'no_show',
          cardGuaranteeStatus: 'card_saved',
          noShowFeeCents: { $gt: 0 },
        }),
      },
      { $group: { _id: null, count: { $sum: 1 }, totalCents: { $sum: '$noShowFeeCents' } } },
    ]),
  ]);

  const chargedRow = charged[0] ?? { count: 0, totalCents: 0 };
  const refundedRow = refunded[0] ?? { count: 0, totalCents: 0 };
  const failedRow = failed[0] ?? { count: 0, totalCents: 0 };
  const pendingRow = pending[0] ?? { count: 0, totalCents: 0 };

  return {
    chargedCount: chargedRow.count,
    chargedCents: chargedRow.totalCents,
    refundedCount: refundedRow.count,
    refundedCents: refundedRow.totalCents,
    failedCount: failedRow.count,
    failedCents: failedRow.totalCents,
    pendingCount: pendingRow.count,
    pendingCents: pendingRow.totalCents,
    netCollectedCents: Math.max(0, chargedRow.totalCents),
  };
}

async function buildSearchClause(q: string): Promise<Record<string, unknown> | null> {
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
  if (!or.length) return { _id: EMPTY_OBJECT_ID };
  return { $or: or };
}

export async function listNoShowFeeCharges(args: {
  restaurantIds?: Array<mongoose.Types.ObjectId | string>;
  restaurantId?: string;
  feeStatus?: string | null;
  reason?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}) {
  const scope: Record<string, unknown> = {};
  if (args.restaurantId) {
    scope.restaurantId = new mongoose.Types.ObjectId(args.restaurantId);
  } else if (args.restaurantIds?.length) {
    scope.restaurantId = {
      $in: args.restaurantIds.map((id) =>
        id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)),
      ),
    };
  }

  let timeZone = PLATFORM_RESERVATION_LIST_TIMEZONE;
  if (args.restaurantId) {
    const restaurant = await Restaurant.findById(args.restaurantId)
      .select('address location')
      .lean();
    timeZone = restaurantTimeZone(restaurant ?? {});
  }

  const chargedAtOnly = Boolean(args.startDate && args.endDate);
  if (args.startDate && args.endDate) {
    const start = calendarDayRange(args.startDate, timeZone);
    const end = calendarDayRange(args.endDate, timeZone);
    scope.noShowFeeChargedAt = { $gte: start.$gte, $lt: end.$lt };
  }

  if (args.reason === 'no_show' || args.reason === 'late_cancel') {
    scope.noShowFeeReason = args.reason;
  }

  const q = args.search?.trim();
  const searchClause = q ? await buildSearchClause(q) : null;
  const activity = noShowFeeActivityClause(args.feeStatus, { chargedAtOnly });
  const filter = andClauses(scope, activity, searchClause ?? undefined);

  const [page, summary] = await Promise.all([
    paginateQuery(Reservation, filter, {
      sort: { noShowFeeChargedAt: -1, createdAt: -1 },
      limit: args.limit,
      offset: args.offset,
      defaultLimit: 25,
      map: mapReservation,
    }),
    summarizeNoShowFeeCharges(andClauses(scope, searchClause ?? undefined)),
  ]);

  return { ...page, summary };
}
