import { Queue, Worker } from 'bullmq';
import { Resend } from 'resend';
import webpush from 'web-push';
import {
  DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPE_TO_EVENT,
  REMINDER_HOURS,
  type NotificationChannel,
} from '@reservations/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Loyalty.js';
import { Reservation } from '../models/Reservation.js';
import { Restaurant } from '../models/Restaurant.js';
import { mapNotificationPreferences } from '../lib/notificationPreferences.js';
import { releaseTableSlotClaims } from './tableSlotClaims.js';
import { captureDeposit } from './stripe.js';

const connection = { url: env.REDIS_URL };

export const notificationQueue = new Queue('notifications', { connection });
export const reminderQueue = new Queue('reminders', { connection });

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(to: string, title: string, body: string) {
  if (!resend) {
    logger.debug({ to, title, body }, '[email:dev] stub');
    return;
  }
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: title,
    text: body,
  });
}

export async function sendSms(to: string, body: string) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    logger.debug({ to, body }, '[sms:dev] stub');
    return;
  }
  const twilio = await import('twilio');
  const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ to, from: env.TWILIO_FROM_NUMBER, body });
}

async function sendTelegram(chatId: string, title: string, body: string) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.debug({ chatId, title, body }, '[telegram:dev] stub');
    return;
  }
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${title}*\n${body}`,
      parse_mode: 'Markdown',
    }),
  });
}

async function sendPush(
  tokens: Array<{ token: string; platform: string }>,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  for (const t of tokens) {
    try {
      if (t.platform === 'web' && env.VAPID_PUBLIC_KEY) {
        await webpush.sendNotification(
          JSON.parse(t.token),
          JSON.stringify({ title, body, data }),
        );
      } else {
        // Expo push
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: t.token,
            title,
            body,
            data,
          }),
        });
      }
    } catch (err) {
      logger.error({ err, token: t.token }, '[push] failed');
    }
  }
}

export async function notifyUser(
  userId: string,
  payload: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
  opts?: {
    /** When set, also send SMS if this restaurant has Premium SMS and the user has a phone. */
    smsRestaurantId?: string;
  },
) {
  const user = await User.findById(userId);
  if (!user) return;

  const eventKey = NOTIFICATION_TYPE_TO_EVENT[payload.type];
  let channelPrefs: Record<NotificationChannel, boolean>;

  if (eventKey && NOTIFICATION_EVENTS.includes(eventKey)) {
    channelPrefs = mapNotificationPreferences(user.notificationPreferences)[eventKey];
  } else {
    // Security / account messages (e.g. password_reset) always use email defaults.
    channelPrefs = {
      ...DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES,
      sms: false,
      webPush: false,
      platform: false,
      email: true,
    };
  }

  const channels: Array<'email' | 'telegram' | 'push' | 'sms' | 'in_app'> = [];
  // In-app inbox follows the Platform preference (except account/security messages).
  if (payload.type !== 'password_reset' && channelPrefs.platform) {
    channels.push('in_app');
  }
  if (channelPrefs.email && user.email) channels.push('email');
  if (channelPrefs.platform && user.telegramChatId) channels.push('telegram');
  if (channelPrefs.webPush && user.pushTokens.length) channels.push('push');

  if (channelPrefs.sms && opts?.smsRestaurantId && user.phone) {
    try {
      const { hasPremiumSms } = await import('./plans.js');
      if (await hasPremiumSms(opts.smsRestaurantId)) channels.push('sms');
    } catch (err) {
      logger.error({ err }, '[notify] premium sms check failed');
    }
  }

  for (const channel of channels) {
    const doc = await Notification.create({
      userId,
      channel,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: 'queued',
    });

    try {
      if (channel === 'in_app') {
        // Inbox item only — no external delivery.
      } else if (channel === 'email' && user.email) {
        await sendEmail(user.email, payload.title, payload.body);
      } else if (channel === 'telegram' && user.telegramChatId) {
        await sendTelegram(user.telegramChatId, payload.title, payload.body);
      } else if (channel === 'push') {
        await sendPush(user.pushTokens, payload.title, payload.body, payload.data);
      } else if (channel === 'sms' && user.phone) {
        await sendSms(user.phone, `${payload.title}: ${payload.body}`);
      }
      doc.status = 'sent';
      doc.sentAt = new Date();
      await doc.save();
    } catch (err) {
      doc.status = 'failed';
      doc.error = err instanceof Error ? err.message : 'Unknown error';
      await doc.save();
    }
  }
}

/** Notify a restaurant's owner (and linked staff accounts). */
export async function notifyRestaurantStaff(
  restaurantId: string,
  payload: { type: string; title: string; body: string; data?: Record<string, unknown> },
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return;
  const staff = await User.find({
    $or: [{ _id: restaurant.ownerId }, { restaurantIds: restaurant._id }],
  }).select('_id');
  await Promise.all(
    staff.map((u) =>
      notifyUser(u._id.toString(), payload, { smsRestaurantId: restaurantId }),
    ),
  );
}

export async function scheduleReservationReminders(reservationId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return;

  for (const hours of REMINDER_HOURS) {
    const runAt = new Date(reservation.slotStart.getTime() - hours * 60 * 60 * 1000);
    if (runAt <= new Date()) continue;
    await reminderQueue.add(
      'reservation-reminder',
      { reservationId, hours },
      { delay: runAt.getTime() - Date.now(), jobId: `reminder-${reservationId}-${hours}h` },
    );
  }

  // Mark no-show only after the reserved turn window ends (not 30m after start),
  // so the table stays blocked for the full seating duration.
  const noShowAt = new Date(reservation.slotEnd.getTime());
  await reminderQueue.add(
    'no-show-check',
    { reservationId },
    {
      delay: Math.max(0, noShowAt.getTime() - Date.now()),
      jobId: `noshow-${reservationId}`,
    },
  );
}

let workersStarted = false;

export function startNotificationWorkers() {
  if (workersStarted) return;
  workersStarted = true;

  new Worker(
    'reminders',
    async (job) => {
      if (job.name === 'reservation-reminder') {
        const { reservationId, hours } = job.data as {
          reservationId: string;
          hours: number;
        };
        const reservation = await Reservation.findById(reservationId);
        if (!reservation || !['confirmed', 'pending'].includes(reservation.status)) return;
        const restaurant = await Restaurant.findById(reservation.restaurantId);
        await notifyUser(
          reservation.dinerId.toString(),
          {
            type: 'reservation_reminder',
            title: `Reservation in ${hours}h`,
            body: `Reminder: ${restaurant?.name ?? 'Restaurant'} at ${reservation.slotStart.toLocaleString()}`,
            data: { reservationId },
          },
          { smsRestaurantId: reservation.restaurantId.toString() },
        );
      }

      if (job.name === 'no-show-check') {
        const { reservationId } = job.data as { reservationId: string };
        const reservation = await Reservation.findById(reservationId);
        if (reservation?.status === 'confirmed') {
          reservation.status = 'no_show';
          if (reservation.stripePaymentIntentId && reservation.depositStatus === 'authorized') {
            await captureDeposit(reservation.stripePaymentIntentId);
            reservation.depositStatus = 'captured';
          }
          await reservation.save();
          await releaseTableSlotClaims(reservation._id);
        }
      }
    },
    { connection },
  );

  logger.info('[jobs] notification workers started');
}
