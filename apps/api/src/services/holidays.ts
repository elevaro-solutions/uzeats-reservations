import {
  DEFAULT_PLATFORM_HOLIDAYS,
  holidayAppliesToRestaurant,
  resolveHolidayDate,
  type PlatformHolidayDef,
} from '@reservations/shared';
import { DateScheduleOverride } from '../models/DateScheduleOverride.js';
import { Restaurant } from '../models/Restaurant.js';
import { getPlatformConfig } from './platformConfig.js';

export type StoredPlatformHoliday = PlatformHolidayDef & {
  /** One-off YYYY-MM-DD when not recurring. */
  oneOffDate?: string | null;
};

export function normalizePlatformHolidays(raw: unknown): StoredPlatformHoliday[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PLATFORM_HOLIDAYS.map((h) => ({ ...h }));
  }
  return raw
    .filter((h): h is Record<string, unknown> => Boolean(h) && typeof h === 'object')
    .map((h) => ({
      key: String(h.key ?? '').trim(),
      name: String(h.name ?? '').trim() || String(h.key ?? ''),
      dateRule: typeof h.dateRule === 'string' ? h.dateRule : undefined,
      recurring: h.recurring !== false,
      defaultEnabled: h.defaultEnabled === true,
      floating: h.floating as PlatformHolidayDef['floating'],
      oneOffDate: typeof h.oneOffDate === 'string' ? h.oneOffDate : null,
    }))
    .filter((h) => h.key.length > 0);
}

export async function listPlatformHolidays(): Promise<StoredPlatformHoliday[]> {
  const config = await getPlatformConfig();
  return normalizePlatformHolidays((config as { holidays?: unknown }).holidays);
}

export function holidayDateForYear(holiday: StoredPlatformHoliday, year: number): string | null {
  if (!holiday.recurring && holiday.oneOffDate) return holiday.oneOffDate;
  return resolveHolidayDate(holiday, year);
}

/** Approved schedule override for a restaurant+date, if any. */
export async function getApprovedScheduleOverride(restaurantId: string, date: string) {
  return DateScheduleOverride.findOne({
    restaurantId,
    date,
    status: 'approved',
  }).lean();
}

/**
 * Whether a platform holiday should close this restaurant on `date`
 * (when no explicit approved override exists).
 */
export async function shouldCloseForPlatformHoliday(
  restaurantId: string,
  date: string,
): Promise<{ closed: boolean; holidayKey?: string; holidayName?: string }> {
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(year)) return { closed: false };

  const [restaurant, holidays, existing] = await Promise.all([
    Restaurant.findById(restaurantId)
      .select('applyPlatformHolidays holidayOptOutKeys holidayOptInKeys requireHolidayApproval')
      .lean(),
    listPlatformHolidays(),
    DateScheduleOverride.findOne({ restaurantId, date }).lean(),
  ]);

  if (existing) {
    if (existing.status === 'approved' && existing.mode === 'closed') {
      return { closed: true, holidayKey: existing.holidayKey ?? undefined };
    }
    if (existing.status === 'approved' && existing.mode === 'custom_hours') {
      return { closed: false };
    }
    if (existing.status === 'rejected') return { closed: false };
    // pending: do not auto-close until approved
    if (existing.status === 'pending') return { closed: false };
  }

  if (!restaurant) return { closed: false };

  for (const holiday of holidays) {
    const holidayDate = holidayDateForYear(holiday, year);
    if (holidayDate !== date) continue;
    if (
      !holidayAppliesToRestaurant({
        holiday,
        applyPlatformHolidays: (restaurant as { applyPlatformHolidays?: boolean }).applyPlatformHolidays,
        holidayOptOutKeys: (restaurant as { holidayOptOutKeys?: string[] }).holidayOptOutKeys,
        holidayOptInKeys: (restaurant as { holidayOptInKeys?: string[] }).holidayOptInKeys,
      })
    ) {
      continue;
    }

    // Default: stay open and queue a pending close for owner/manager approval.
    const requireApproval =
      (restaurant as { requireHolidayApproval?: boolean | null }).requireHolidayApproval !== false;
    if (requireApproval) {
      await ensurePendingHolidayOverride({
        restaurantId,
        date,
        holidayKey: holiday.key,
        holidayName: holiday.name,
      });
      return { closed: false, holidayKey: holiday.key, holidayName: holiday.name };
    }

    return { closed: true, holidayKey: holiday.key, holidayName: holiday.name };
  }

  return { closed: false };
}

async function ensurePendingHolidayOverride(params: {
  restaurantId: string;
  date: string;
  holidayKey: string;
  holidayName: string;
}) {
  await DateScheduleOverride.findOneAndUpdate(
    { restaurantId: params.restaurantId, date: params.date },
    {
      $setOnInsert: {
        restaurantId: params.restaurantId,
        date: params.date,
        mode: 'closed',
        reason: params.holidayName,
        source: 'platform_holiday',
        holidayKey: params.holidayKey,
        status: 'pending',
      },
    },
    { upsert: true, new: true },
  );
}

/**
 * Queue pending close-approvals for major holidays in the given years
 * (default: this year + next). Safe to call from the Closures & hours UI.
 * Does nothing when the venue opts out of platform holidays or auto-closes.
 */
export async function ensureUpcomingHolidayApprovals(
  restaurantId: string,
  years?: number[],
) {
  const restaurant = await Restaurant.findById(restaurantId)
    .select('applyPlatformHolidays holidayOptOutKeys holidayOptInKeys requireHolidayApproval')
    .lean();
  if (!restaurant) return;
  if ((restaurant as { applyPlatformHolidays?: boolean }).applyPlatformHolidays === false) return;
  if ((restaurant as { requireHolidayApproval?: boolean | null }).requireHolidayApproval === false) {
    return;
  }

  const nowYear = new Date().getUTCFullYear();
  const targetYears = years?.length ? years : [nowYear, nowYear + 1];
  const holidays = await listPlatformHolidays();
  const today = new Date().toISOString().slice(0, 10);

  for (const year of targetYears) {
    for (const holiday of holidays) {
      if (
        !holidayAppliesToRestaurant({
          holiday,
          applyPlatformHolidays: (restaurant as { applyPlatformHolidays?: boolean }).applyPlatformHolidays,
          holidayOptOutKeys: (restaurant as { holidayOptOutKeys?: string[] }).holidayOptOutKeys,
          holidayOptInKeys: (restaurant as { holidayOptInKeys?: string[] }).holidayOptInKeys,
        })
      ) {
        continue;
      }
      const date = holidayDateForYear(holiday, year);
      if (!date || date < today) continue;
      await ensurePendingHolidayOverride({
        restaurantId,
        date,
        holidayKey: holiday.key,
        holidayName: holiday.name,
      });
    }
  }
}

export function mapDateScheduleOverride(doc: {
  _id: { toString(): string };
  restaurantId: { toString(): string };
  date: string;
  mode: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  source?: string | null;
  holidayKey?: string | null;
  status: string;
  requestedById?: { toString(): string } | null;
  reviewedById?: { toString(): string } | null;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    restaurantId: doc.restaurantId.toString(),
    date: doc.date,
    mode: doc.mode,
    startTime: doc.startTime ?? null,
    endTime: doc.endTime ?? null,
    reason: doc.reason ?? null,
    source: doc.source ?? 'manual',
    holidayKey: doc.holidayKey ?? null,
    status: doc.status,
    requestedById: doc.requestedById?.toString() ?? null,
    reviewedById: doc.reviewedById?.toString() ?? null,
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}
