import { GuestProfile } from '../models/GuestProfile.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { SurveyConfig } from '../models/Survey.js';
import { getFeatures } from './plans.js';
import { notifyUser, notifyRestaurantStaff } from './notifications.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/** Auto-tag thresholds. */
const AUTO_TAGS = {
  VIP_VISITS: 5,
  BIG_SPENDER_CENTS: 50_000,
  REGULAR_VISITS: 3,
} as const;

/**
 * Recompute a guest's per-restaurant profile after a completed visit and
 * apply automated tags (Pro plan).
 */
export async function updateGuestProfileAfterVisit(reservation: {
  restaurantId: { toString(): string };
  dinerId: { toString(): string };
  partySize: number;
  occasion?: string;
  totalSpendCents?: number;
}) {
  const restaurantId = reservation.restaurantId.toString();
  const dinerId = reservation.dinerId.toString();

  const completed = await Reservation.find({
    restaurantId,
    dinerId,
    status: 'completed',
  }).select('partySize totalSpendCents slotStart occasion');

  const totalVisits = completed.length;
  const totalSpendCents = completed.reduce((sum, r) => sum + (r.totalSpendCents ?? 0), 0);
  const averagePartySize =
    totalVisits > 0
      ? Math.round((completed.reduce((s, r) => s + r.partySize, 0) / totalVisits) * 10) / 10
      : 0;
  const lastVisitDate = completed.reduce<Date | undefined>(
    (latest, r) => (!latest || r.slotStart > latest ? r.slotStart : latest),
    undefined,
  );
  const occasions = [
    ...new Set(
      completed
        .map((r) => r.occasion as string | undefined)
        .filter((o): o is string => !!o && o !== 'none'),
    ),
  ];

  const profile = await GuestProfile.findOneAndUpdate(
    { restaurantId, dinerId },
    {
      $set: { totalVisits, totalSpendCents, averagePartySize, lastVisitDate, occasions },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  try {
    const features = await getFeatures(restaurantId);
    if (features.autoTags) {
      const tags = new Set(profile.tags ?? []);
      if (totalVisits >= AUTO_TAGS.VIP_VISITS) tags.add('VIP');
      if (totalVisits >= AUTO_TAGS.REGULAR_VISITS) tags.add('Regular');
      if (totalSpendCents >= AUTO_TAGS.BIG_SPENDER_CENTS) tags.add('Big spender');
      if (occasions.includes('birthday')) tags.add('Birthday celebrant');
      if (occasions.includes('anniversary')) tags.add('Anniversary celebrant');

      const newTags = [...tags];
      if (newTags.length !== (profile.tags ?? []).length) {
        profile.tags = newTags as typeof profile.tags;
        if (totalVisits >= AUTO_TAGS.VIP_VISITS && profile.vipStatus === 'none') {
          profile.vipStatus = 'vip';
        } else if (totalVisits >= AUTO_TAGS.REGULAR_VISITS && profile.vipStatus === 'none') {
          profile.vipStatus = 'regular';
        }
        await profile.save();
      }
    }
  } catch (err) {
    logger.error({ err }, '[guests] auto-tag failed');
  }

  return profile;
}

/** Record POS spend on a guest profile and fire real-time spend alerts. */
export async function recordGuestSpend(input: {
  restaurantId: string;
  dinerId: string;
  amountCents: number;
  reservationId?: string;
}) {
  await GuestProfile.findOneAndUpdate(
    { restaurantId: input.restaurantId, dinerId: input.dinerId },
    { $inc: { totalSpendCents: input.amountCents } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  try {
    const restaurant = await Restaurant.findById(input.restaurantId);
    if (!restaurant) return;
    const threshold = restaurant.spendAlertThresholdCents ?? 0;
    if (threshold <= 0 || input.amountCents < threshold) return;

    const features = await getFeatures(input.restaurantId);
    if (!features.spendAlerts) return;

    await notifyRestaurantStaff(input.restaurantId, {
      type: 'guest_spend_alert',
      title: 'High spend alert',
      body: `A guest check just hit $${(input.amountCents / 100).toFixed(2)} at ${restaurant.name}.`,
      data: { reservationId: input.reservationId, amountCents: input.amountCents },
    });
  } catch (err) {
    logger.error({ err }, '[guests] spend alert failed');
  }
}

/** Send the post-dining survey invitation if the restaurant enabled surveys. */
export async function sendSurveyInvitation(reservation: {
  _id: { toString(): string };
  restaurantId: { toString(): string };
  dinerId: { toString(): string };
}) {
  try {
    const restaurantId = reservation.restaurantId.toString();
    const features = await getFeatures(restaurantId);
    if (!features.surveys) return;

    const config = await SurveyConfig.findOne({ restaurantId });
    if (!config?.enabled) return;

    const restaurant = await Restaurant.findById(restaurantId);
    const url = `${env.WEB_APP_URL}/survey/${reservation._id.toString()}`;
    await notifyUser(
      reservation.dinerId.toString(),
      {
        type: 'survey_invitation',
        title: `How was your visit to ${restaurant?.name ?? 'the restaurant'}?`,
        body: `We'd love your feedback — it takes under a minute: ${url}`,
        data: { reservationId: reservation._id.toString(), url },
      },
      { smsRestaurantId: restaurantId },
    );
  } catch (err) {
    logger.error({ err }, '[guests] survey invitation failed');
  }
}
