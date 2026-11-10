import {
  hmInTimeZone,
  isoDateInTimeZone,
  restaurantTimeZone,
  weekdayInTimeZone,
} from '@reservations/shared';
import mongoose from 'mongoose';
import { AccessRule, type AccessRuleDocument } from '../models/AccessRule.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { getFeatures } from './plans.js';

const DEFAULT_MAX_ADVANCE_DAYS = 90;

function ruleAppliesToSlot(rule: AccessRuleDocument, slotStart: Date, timeZone: string) {
  const dateStr = isoDateInTimeZone(slotStart, timeZone);
  if (rule.daysOfWeek?.length && !rule.daysOfWeek.includes(weekdayInTimeZone(slotStart, timeZone))) {
    return false;
  }
  if (rule.startDate && dateStr < rule.startDate) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;
  if (rule.startTime && rule.endTime) {
    const hm = hmInTimeZone(slotStart, timeZone);
    if (hm < rule.startTime || hm >= rule.endTime) return false;
  }
  return true;
}

/** Active party-size rules for restaurants whose plan enforces access rules. */
export async function partySizeRulesByRestaurant(
  restaurantIds: Array<mongoose.Types.ObjectId | string>,
): Promise<Map<string, AccessRuleDocument[]>> {
  const result = new Map<string, AccessRuleDocument[]>();
  if (restaurantIds.length === 0) return result;
  const rules = (await AccessRule.find({
    restaurantId: { $in: restaurantIds },
    active: true,
    $or: [{ minPartySize: { $gt: 0 } }, { maxPartySize: { $gt: 0 } }],
  }).lean()) as AccessRuleDocument[];
  for (const rule of rules) {
    const id = String(rule.restaurantId);
    const list = result.get(id);
    if (list) list.push(rule);
    else result.set(id, [rule]);
  }
  for (const id of [...result.keys()]) {
    if (!(await getFeatures(id)).accessRules) result.delete(id);
  }
  return result;
}

/** Same party-size test `checkAccessRules` applies at booking, for slots offered to diners. */
export function partySizeAllowedAt(
  rules: AccessRuleDocument[],
  partySize: number,
  slotStart: Date,
  timeZone: string,
) {
  return rules.every((rule) => {
    if (!ruleAppliesToSlot(rule, slotStart, timeZone)) return true;
    if (rule.minPartySize && partySize < rule.minPartySize) return false;
    if (rule.maxPartySize && partySize > rule.maxPartySize) return false;
    return true;
  });
}

export async function getBookingWindow(restaurantId: string): Promise<{
  maxAdvanceDays: number;
  minAdvanceHours: number;
}> {
  const features = await getFeatures(restaurantId);
  if (!features.accessRules) {
    return {
      maxAdvanceDays: DEFAULT_MAX_ADVANCE_DAYS,
      minAdvanceHours: 0,
    };
  }

  const rules = await AccessRule.find({
    restaurantId,
    active: true,
  }).lean();

  const maxDays = rules
    .map((r) => r.maxAdvanceDays)
    .filter((n): n is number => typeof n === 'number' && n >= 0);
  const minHours = rules
    .map((r) => r.minAdvanceHours)
    .filter((n): n is number => typeof n === 'number' && n >= 0);

  return {
    maxAdvanceDays: maxDays.length
      ? Math.min(...maxDays)
      : DEFAULT_MAX_ADVANCE_DAYS,
    minAdvanceHours: minHours.length ? Math.max(...minHours) : 0,
  };
}

/**
 * Evaluate a prospective booking against the restaurant's access rules.
 * Returns null when allowed, or a human-readable reason when blocked.
 * Rules only apply when the plan includes the accessRules feature.
 */
export async function checkAccessRules(input: {
  restaurantId: string;
  partySize: number;
  slotStart: Date;
}): Promise<string | null> {
  const features = await getFeatures(input.restaurantId);
  if (!features.accessRules) return null;

  const restaurant = await Restaurant.findById(input.restaurantId).select('address location').lean();
  const timeZone = restaurantTimeZone(restaurant ?? {});

  const rules = await AccessRule.find({ restaurantId: input.restaurantId, active: true });
  const applicable = rules.filter((r) => ruleAppliesToSlot(r, input.slotStart, timeZone));

  for (const rule of applicable) {
    if (rule.minPartySize && input.partySize < rule.minPartySize) {
      return `${rule.name}: minimum party size is ${rule.minPartySize}`;
    }
    if (rule.maxPartySize && input.partySize > rule.maxPartySize) {
      return `${rule.name}: maximum party size is ${rule.maxPartySize}`;
    }
    const hoursAhead = (input.slotStart.getTime() - Date.now()) / 3_600_000;
    if (rule.minAdvanceHours && hoursAhead < rule.minAdvanceHours) {
      return `${rule.name}: bookings require at least ${rule.minAdvanceHours}h advance notice`;
    }
    if (rule.maxAdvanceDays && hoursAhead > rule.maxAdvanceDays * 24) {
      return `${rule.name}: bookings open ${rule.maxAdvanceDays} days ahead`;
    }
    if (rule.maxCoversPerSlot && rule.maxCoversPerSlot > 0) {
      const existing = await Reservation.aggregate([
        {
          $match: {
            // Aggregations do not cast; a string id never matched, so the cap was never hit.
            restaurantId: new mongoose.Types.ObjectId(input.restaurantId),
            slotStart: input.slotStart,
            status: { $in: ['pending', 'confirmed', 'seated'] },
          },
        },
        { $group: { _id: null, covers: { $sum: '$partySize' } } },
      ]);
      const booked = existing[0]?.covers ?? 0;
      if (booked + input.partySize > rule.maxCoversPerSlot) {
        return `${rule.name}: this time is fully committed`;
      }
    }
  }

  return null;
}
