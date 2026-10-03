import {
  WAITLIST_DEFAULT_OVERDUE_MINUTES,
  WAITLIST_NOTIFY_HOLD_MINUTES,
  WAITLIST_OVERDUE_REENOTIFY_MINUTES,
  canPartnerTransitionWaitlist,
  formatDateTimeInTimeZone,
  formatWaitlistWaitingLabel,
  hmInTimeZone,
  isoDateInTimeZone,
  restaurantTimeZone,
  waitlistPromisedMinutes,
  waitlistWaitingMinutes,
} from '@reservations/shared';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { WaitlistEntry, type WaitlistDocument } from '../models/Waitlist.js';
import { hasPremiumSms } from './plans.js';
import { notifyRestaurantManagers, notifyUser, sendSms } from './notifications.js';
import { partySizeMatches, timeWindowMatches } from './waitlistEta.js';

export function assertPartnerWaitlistTransition(from: string, to: string) {
  if (from === to) return;
  if (!canPartnerTransitionWaitlist(from, to)) {
    throw new ValidationError(`Cannot change waitlist status from ${from} to ${to}`);
  }
}

type NotifyKind = 'ready' | 'available';

async function sendWaitlistGuestSms(
  restaurantId: string,
  guestPhone: string | null | undefined,
  body: string,
) {
  if (!guestPhone) return;
  if (!(await hasPremiumSms(restaurantId))) return;
  await sendSms(guestPhone, body);
}

/**
 * Mark an entry notified and deliver diner push/SMS or walk-in SMS.
 * Caller is responsible for saving after setting fields, or pass `save: true`.
 */
export async function notifyWaitlistEntry(
  entry: WaitlistDocument,
  options: {
    kind: NotifyKind;
    notifiedSlot?: Date | null;
    restaurantName?: string;
    timeZone?: string;
    save?: boolean;
  },
) {
  entry.status = 'notified';
  entry.notifiedAt = new Date();
  if (options.notifiedSlot) {
    entry.notifiedSlot = options.notifiedSlot;
  }

  const restaurantId = entry.restaurantId.toString();
  const waitlistId = entry._id.toString();

  if (options.kind === 'ready') {
    if (entry.dinerId) {
      await notifyUser(
        entry.dinerId.toString(),
        {
          type: 'waitlist_ready',
          title: 'Your table is ready!',
          body: 'Please check in with the host.',
          data: {
            waitlistId,
            restaurantId,
            url: '/waitlist',
          },
        },
        { smsRestaurantId: restaurantId },
      );
    } else {
      await sendWaitlistGuestSms(
        restaurantId,
        entry.guestPhone,
        'Your table is ready! Please check in with the host.',
      );
    }
  } else {
    const tz = options.timeZone ?? 'UTC';
    const when = options.notifiedSlot
      ? formatDateTimeInTimeZone(options.notifiedSlot, tz)
      : 'soon';
    const body = `A table is available ${when}. Book now before it's gone.`;
    if (entry.dinerId) {
      await notifyUser(
        entry.dinerId.toString(),
        {
          type: 'waitlist_available',
          title: 'A table opened up!',
          body,
          data: {
            waitlistId,
            restaurantId,
            slot: options.notifiedSlot?.toISOString(),
            timeZone: tz,
            url: '/waitlist',
          },
        },
        { smsRestaurantId: restaurantId },
      );
    } else {
      await sendWaitlistGuestSms(restaurantId, entry.guestPhone, body);
    }
  }

  if (options.save !== false) {
    await entry.save();
  }
}

/** Mark matching active waitlist entries booked when a diner creates a reservation. */
export async function markWaitlistBookedForReservation(input: {
  dinerId: string;
  restaurantId: string;
  slotStart: Date;
  reservationId: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId)
    .select('address location')
    .lean();
  const tz = restaurantTimeZone(restaurant ?? {});
  const date = isoDateInTimeZone(input.slotStart, tz);

  const result = await WaitlistEntry.updateMany(
    {
      dinerId: input.dinerId,
      restaurantId: input.restaurantId,
      preferredDate: date,
      status: { $in: ['waiting', 'notified'] },
    },
    {
      $set: {
        status: 'booked',
        reservationId: new mongoose.Types.ObjectId(input.reservationId),
      },
    },
  );

  if (result.modifiedCount > 0) {
    logger.info(
      {
        dinerId: input.dinerId,
        restaurantId: input.restaurantId,
        reservationId: input.reservationId,
        count: result.modifiedCount,
      },
      'waitlist entries marked booked after reservation',
    );
  }
}

/** Find and notify the next waiting party for a freed slot (cancel / expire cascade). */
export async function notifyNextWaitlistForSlot(input: {
  restaurantId: mongoose.Types.ObjectId | string;
  partySize: number;
  slotStart: Date;
  excludeEntryId?: string;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId).select(
    'name address location',
  );
  if (!restaurant) return null;

  const tz = restaurantTimeZone(restaurant);
  const date = isoDateInTimeZone(input.slotStart, tz);
  const slotTime = hmInTimeZone(input.slotStart, tz);

  const filter: Record<string, unknown> = {
    restaurantId: input.restaurantId,
    preferredDate: date,
    partySize: {
      $lte: input.partySize + 2,
      $gte: Math.max(1, input.partySize - 2),
    },
    status: 'waiting',
  };
  if (input.excludeEntryId) {
    filter._id = { $ne: input.excludeEntryId };
  }

  const candidates = await WaitlistEntry.find(filter).sort({ createdAt: 1 }).limit(10);
  const entry = candidates.find(
    (e) =>
      partySizeMatches(e.partySize, input.partySize) && timeWindowMatches(e, slotTime),
  );
  if (!entry) return null;

  await notifyWaitlistEntry(entry, {
    kind: 'available',
    notifiedSlot: input.slotStart,
    restaurantName: restaurant.name,
    timeZone: tz,
  });
  return entry;
}

/**
 * Expire notified entries past the hold window and cascade to the next party
 * when the expired entry had a notifiedSlot.
 */
export async function expireStaleNotifiedWaitlistEntries(now = new Date()) {
  const cutoff = new Date(now.getTime() - WAITLIST_NOTIFY_HOLD_MINUTES * 60_000);
  const stale = await WaitlistEntry.find({
    status: 'notified',
    notifiedAt: { $lte: cutoff },
  }).limit(100);

  let expired = 0;
  let cascaded = 0;

  for (const entry of stale) {
    entry.status = 'expired';
    await entry.save();
    expired += 1;

    if (entry.notifiedSlot) {
      try {
        const next = await notifyNextWaitlistForSlot({
          restaurantId: entry.restaurantId,
          partySize: entry.partySize,
          slotStart: entry.notifiedSlot,
          excludeEntryId: entry._id.toString(),
        });
        if (next) cascaded += 1;
      } catch (err) {
        logger.error(
          { err, waitlistId: entry._id.toString() },
          'waitlist expire cascade failed',
        );
      }
    }
  }

  return { expired, cascaded };
}

/**
 * Alert hosts when a waiting party has exceeded their quoted/default wait.
 * Re-alerts at most every WAITLIST_OVERDUE_REENOTIFY_MINUTES.
 */
export async function notifyOverdueWaitlistEntries(now = new Date()) {
  const minCreatedAt = new Date(
    now.getTime() - WAITLIST_DEFAULT_OVERDUE_MINUTES * 60_000,
  );
  // Candidates that have already waited at least the default threshold (or have
  // a quote — those may overdue earlier, so also pull any with a quote).
  const candidates = await WaitlistEntry.find({
    status: 'waiting',
    $or: [
      { createdAt: { $lte: minCreatedAt } },
      { quotedWaitMinutes: { $gt: 0 } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(100);

  let notified = 0;
  const renotifyCutoff = new Date(
    now.getTime() - WAITLIST_OVERDUE_REENOTIFY_MINUTES * 60_000,
  );

  for (const entry of candidates) {
    const waitingMinutes = waitlistWaitingMinutes(entry.createdAt as Date, now);
    const promised = waitlistPromisedMinutes({
      quotedWaitMinutes: entry.quotedWaitMinutes,
      // Job avoids N+1 ETA; quote or platform default is the host promise.
      estimatedWaitMinutes: null,
    });
    if (waitingMinutes <= promised) continue;
    if (entry.overdueNotifiedAt && entry.overdueNotifiedAt > renotifyCutoff) {
      continue;
    }

    const guest = await resolveWaitlistGuestName(entry);
    const guestLabel = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim() || 'Guest';
    const waitedLabel = formatWaitlistWaitingLabel(waitingMinutes);
    const restaurantId = entry.restaurantId.toString();
    const waitlistPath = env.DASHBOARD_APP_URL
      ? `${env.DASHBOARD_APP_URL.replace(/\/$/, '')}/waitlist?restaurant=${encodeURIComponent(restaurantId)}`
      : '/waitlist';

    try {
      await notifyRestaurantManagers(restaurantId, {
        type: 'waitlist_overdue',
        title: 'Waitlist party overdue',
        body: `${guestLabel} (party of ${entry.partySize}) has been waiting ${waitedLabel} — promised ~${promised} min.`,
        data: {
          waitlistId: entry._id.toString(),
          restaurantId,
          waitingMinutes,
          promisedWaitMinutes: promised,
          url: waitlistPath,
        },
      });
      entry.overdueNotifiedAt = now;
      await entry.save();
      notified += 1;
    } catch (err) {
      logger.error(
        { err, waitlistId: entry._id.toString() },
        'waitlist overdue host notify failed',
      );
    }
  }

  return { notified, checked: candidates.length };
}

export async function resolveWaitlistGuestName(entry: WaitlistDocument): Promise<{
  firstName: string;
  lastName?: string;
  phone?: string;
}> {
  if (entry.guestName?.trim()) {
    const parts = entry.guestName.trim().split(/\s+/);
    return {
      firstName: parts[0] ?? 'Guest',
      lastName: parts.slice(1).join(' ') || undefined,
      phone: entry.guestPhone ?? undefined,
    };
  }
  if (entry.dinerId) {
    const diner = await User.findById(entry.dinerId).select('firstName lastName phone');
    if (diner) {
      return {
        firstName: diner.firstName || 'Guest',
        lastName: diner.lastName || undefined,
        phone: diner.phone ?? entry.guestPhone ?? undefined,
      };
    }
  }
  return {
    firstName: 'Guest',
    phone: entry.guestPhone ?? undefined,
  };
}

type WalkInGuestFields = {
  dinerId?: string;
  guestName: string;
  guestPhone?: string;
};

/** Resolve diner link + display name/phone for walk-in create/update. */
export async function resolveWalkInGuestFields(input: {
  dinerId?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  /** Soft-link a platform account when phone matches (default true). */
  allowPhoneLink?: boolean;
}): Promise<WalkInGuestFields> {
  let dinerId = input.dinerId?.trim() || undefined;
  let guestName = input.guestName?.trim() || '';
  let guestPhone = input.guestPhone?.trim() || undefined;
  const allowPhoneLink = input.allowPhoneLink !== false;

  if (dinerId) {
    const diner = await User.findById(dinerId).select('firstName lastName phone role');
    if (!diner) {
      throw new ValidationError('Guest account not found');
    }
    if (!guestName) {
      guestName =
        [diner.firstName, diner.lastName].filter(Boolean).join(' ').trim() || 'Guest';
    }
    if (!guestPhone && diner.phone) {
      guestPhone = diner.phone;
    }
  } else if (guestPhone && allowPhoneLink) {
    const byPhone = await User.findOne({ phone: guestPhone }).select('_id').lean();
    if (byPhone) dinerId = byPhone._id.toString();
  }

  if (!guestName) {
    throw new ValidationError('Guest name is required');
  }

  return { dinerId, guestName, guestPhone };
}

/**
 * Partner edit of guest details / party / quoted wait on an active entry.
 */
export async function updateWaitlistEntry(input: {
  id: string;
  dinerId?: string | null;
  guestName?: string;
  guestPhone?: string;
  partySize?: number;
  quotedWaitMinutes?: number | null;
}): Promise<WaitlistDocument> {
  const entry = await WaitlistEntry.findById(input.id);
  if (!entry) throw new ValidationError('Waitlist entry not found');
  if (!['waiting', 'notified'].includes(entry.status)) {
    throw new ValidationError('Only active waitlist entries can be edited');
  }

  const nextName =
    input.guestName !== undefined ? input.guestName : entry.guestName;
  const nextPhone =
    input.guestPhone !== undefined
      ? input.guestPhone === ''
        ? null
        : input.guestPhone
      : entry.guestPhone;
  const clearingDiner = input.dinerId === null;
  const nextDinerId = clearingDiner
    ? null
    : input.dinerId !== undefined
      ? input.dinerId
      : (entry.dinerId?.toString() ?? null);

  const resolved = await resolveWalkInGuestFields({
    dinerId: nextDinerId,
    guestName: nextName,
    guestPhone: nextPhone,
    allowPhoneLink: !clearingDiner,
  });

  if (resolved.dinerId) {
    const duplicate = await WaitlistEntry.findOne({
      _id: { $ne: entry._id },
      dinerId: resolved.dinerId,
      restaurantId: entry.restaurantId,
      preferredDate: entry.preferredDate,
      status: { $in: ['waiting', 'notified'] },
    })
      .select('_id')
      .lean();
    if (duplicate) {
      throw new ValidationError(
        'This guest is already on the waitlist for this date',
      );
    }
  }

  if (clearingDiner || !resolved.dinerId) {
    entry.set('dinerId', undefined);
  } else {
    entry.dinerId = new mongoose.Types.ObjectId(resolved.dinerId);
  }

  entry.guestName = resolved.guestName;
  entry.set('guestPhone', resolved.guestPhone ?? undefined);

  if (input.partySize !== undefined) {
    entry.partySize = input.partySize;
  }
  if (input.quotedWaitMinutes !== undefined) {
    if (input.quotedWaitMinutes == null) {
      entry.set('quotedWaitMinutes', undefined);
    } else {
      entry.quotedWaitMinutes = input.quotedWaitMinutes;
    }
  }

  await entry.save();
  return entry;
}
