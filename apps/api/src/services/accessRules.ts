import { AccessRule, type AccessRuleDocument } from '../models/AccessRule.js';
import { Reservation } from '../models/Reservation.js';
import { getFeatures } from './plans.js';

function toHm(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function ruleAppliesToSlot(rule: AccessRuleDocument, slotStart: Date) {
  const dateStr = slotStart.toISOString().slice(0, 10);
  if (rule.daysOfWeek?.length && !rule.daysOfWeek.includes(slotStart.getDay())) return false;
  if (rule.startDate && dateStr < rule.startDate) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;
  if (rule.startTime && rule.endTime) {
    const hm = toHm(slotStart);
    if (hm < rule.startTime || hm >= rule.endTime) return false;
  }
  return true;
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

  const rules = await AccessRule.find({ restaurantId: input.restaurantId, active: true });
  const applicable = rules.filter((r) => ruleAppliesToSlot(r, input.slotStart));

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
            restaurantId: rules[0]!.restaurantId,
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
