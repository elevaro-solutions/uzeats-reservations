import { Queue, Worker } from 'bullmq';
import webpush from 'web-push';
import {
  formatDateTimeInTimeZone,
  restaurantTimeZone,
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
import { Table } from '../models/Table.js';
import { mapNotificationPreferences } from '../lib/notificationPreferences.js';
import { releaseTableSlotClaims } from './tableSlotClaims.js';
import { captureDeposit } from './stripe.js';
import { sendTelegramNotification } from './telegram.js';
import { textToEmailHtml, wrapEmailHtml } from './emailBranding.js';
import { sendElevaroMerchantNotification } from './elevaroNotifier.js';

export { wrapEmailHtml } from './emailBranding.js';

const EMPTY_FIELD = '—';

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_FIELD;
}

async function buildReservationMessengerContent(
  reservationId: string,
  restaurant: (Parameters<typeof restaurantTimeZone>[0] & { name?: string | null }) | null,
  fallbackTitle: string,
  options?: { includeSpecialRequest?: boolean },
): Promise<{
  title: string;
  body: string;
  payload: Record<string, unknown>;
}> {
  const includeSpecialRequest = options?.includeSpecialRequest !== false;
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    return {
      title: fallbackTitle,
      body: restaurant?.name ? String(restaurant.name) : EMPTY_FIELD,
      payload: { reservationId },
    };
  }

  const [diner, tables] = await Promise.all([
    User.findById(reservation.dinerId).select('firstName lastName email phone'),
    Table.find({ _id: { $in: reservation.tableIds } }).select('name'),
  ]);

  const guestName = [diner?.firstName, diner?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const email = displayOrDash(diner?.email);
  const phone = displayOrDash(diner?.phone);
  const tableNumber = displayOrDash(
    tables
      .map((t) => t.name)
      .filter(Boolean)
      .join(', '),
  );
  const specialRequest = displayOrDash(reservation.guestNotes);
  const when = formatDateTimeInTimeZone(
    reservation.slotStart,
    restaurantTimeZone(restaurant ?? {}),
  );
  const partySize = String(reservation.partySize);

  const lines = [
    `Email: ${email}`,
    `Full name: ${displayOrDash(guestName)}`,
    `Table: ${tableNumber}`,
    `Phone: ${phone}`,
  ];
  if (includeSpecialRequest) {
    lines.push(`Special request: ${specialRequest}`);
  }
  lines.push(`Time: ${when}`, `Guests: ${partySize}`);

  return {
    title: fallbackTitle,
    body: lines.join('\n'),
    payload: {
      reservationId,
      restaurantName: restaurant?.name ?? '',
      email,
      guestName: guestName || EMPTY_FIELD,
      tableNumber,
      phone,
      specialRequest,
      when,
      partySize,
    },
  };
}

const connection = { url: env.REDIS_URL };

export const notificationQueue = new Queue('notifications', { connection });
export const reminderQueue = new Queue('reminders', { connection });

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

function parseEmailFrom(from: string): { email: string; name?: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match?.[1] && match[2]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: from.trim() };
}

async function sendViaSendGrid(
  to: string,
  title: string,
  body: string,
  htmlBody?: string,
  attachments?: Array<{
    filename: string;
    contentBase64: string;
    contentType: string;
  }>,
) {
  const content: Array<{ type: string; value: string }> = [
    { type: 'text/plain', value: body },
  ];
  if (htmlBody) {
    content.push({ type: 'text/html', value: htmlBody });
  }

  // SendGrid 400s if `attachments` is present but empty.
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: to }] }],
    from: parseEmailFrom(env.EMAIL_FROM),
    subject: title,
    content,
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
    },
  };
  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      content: a.contentBase64,
      filename: a.filename,
      type: a.contentType,
      disposition: 'attachment',
    }));
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SendGrid failed: ${res.status} ${errText}`);
  }
}

export async function sendEmail(
  to: string,
  title: string,
  body: string,
  options?: {
    htmlBody?: string;
    attachments?: Array<{
      filename: string;
      contentBase64: string;
      contentType: string;
    }>;
  },
) {
  const normalizedTo = to.trim().toLowerCase();
  // Avoid SendGrid blocks / reputation hits from seed and non-routable addresses.
  if (
    normalizedTo.endsWith('.local') ||
    normalizedTo.endsWith('.test') ||
    normalizedTo.endsWith('@example.com') ||
    normalizedTo.endsWith('@test.com')
  ) {
    throw new Error(`Refusing to send email to non-deliverable address: ${to}`);
  }

  const innerHtml = options?.htmlBody ?? textToEmailHtml(body);
  const htmlBody = wrapEmailHtml(innerHtml);
  const attachments = options?.attachments ?? [];

  if (!env.SENDGRID_API_KEY) {
    logger.warn({ to: normalizedTo, title }, '[email] no provider configured (SENDGRID_API_KEY)');
    throw new Error(
      'Email delivery is not configured — set SENDGRID_API_KEY on the API server.',
    );
  }
  await sendViaSendGrid(normalizedTo, title, body, htmlBody, attachments);
  logger.info({ to: normalizedTo, subject: title }, '[email] sent via SendGrid');
}

export function isEmailDeliveryConfigured() {
  return Boolean(env.SENDGRID_API_KEY);
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
    htmlBody?: string;
    attachments?: Array<{
      filename: string;
      contentBase64: string;
      contentType: string;
    }>;
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
  } else if (payload.type === 'password_reset') {
    // Security / account messages: email only (no inbox spam).
    channelPrefs = {
      ...DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES,
      sms: false,
      webPush: false,
      platform: false,
      messenger: false,
      email: true,
    };
  } else {
    // Unmapped product types: use defaults (includes in-app) so inbox never silently drops.
    logger.warn({ type: payload.type }, '[notify] unmapped notification type; using defaults');
    channelPrefs = { ...DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES };
  }

  const channels: Array<'email' | 'telegram' | 'push' | 'sms' | 'in_app'> = [];
  // In-app inbox follows the Platform preference (except password_reset).
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
        await sendEmail(user.email, payload.title, payload.body, {
          htmlBody: payload.htmlBody,
          attachments: payload.attachments,
        });
      } else if (channel === 'telegram' && user.telegramChatId) {
        await sendTelegramNotification(user.telegramChatId, payload.title, payload.body);
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
export async function notifyRestaurantManagers(
  restaurantId: string,
  payload: { type: string; title: string; body: string; data?: Record<string, unknown> },
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return;
  const staff = await User.find({
    $or: [{ _id: restaurant.ownerId }, { restaurantIds: restaurant._id }],
  }).select('_id role notificationPreferences');
  const staffIds = staff.map((u) => u._id.toString());
  const ownerId = restaurant.ownerId.toString();
  const staffPayload = {
    ...payload,
    data: { ...payload.data, restaurantId },
  };
  await Promise.all(
    staffIds.map((id) =>
      notifyUser(id, staffPayload, { smsRestaurantId: restaurantId }),
    ),
  );

  // Actionable messenger fan-out (Telegram / WhatsApp via Elevaro notifier)
  const reservationId =
    typeof payload.data?.reservationId === 'string'
      ? payload.data.reservationId
      : undefined;
  const messengerEvents = new Set([
    'new_reservation',
    'reservation_cancelled',
    'reservation_updated',
  ]);
  if (reservationId && messengerEvents.has(payload.type)) {
    const prefEvent =
      payload.type === 'new_reservation' ? 'newReservation' : 'reservationUpdates';
    const messengerUserIds = staff
      .filter((u) => {
        const id = u._id.toString();
        if (id === ownerId) return true;
        const prefs = mapNotificationPreferences(u.notificationPreferences);
        return prefs[prefEvent]?.messenger === true;
      })
      .map((u) => u._id.toString());

    if (messengerUserIds.length === 0) return;

    const openUrl = env.DASHBOARD_APP_URL
      ? `${env.DASHBOARD_APP_URL.replace(/\/$/, '')}/reservations/${reservationId}`
      : undefined;
    const actions =
      payload.type === 'new_reservation'
        ? (['accept', 'reject', 'open'] as const)
        : (['open'] as const);

    const messengerTitle =
      payload.type === 'new_reservation'
        ? 'New reservation'
        : payload.type === 'reservation_cancelled'
          ? 'Reservation cancelled'
          : payload.type === 'reservation_updated'
            ? 'Reservation updated'
            : payload.title;

    void (async () => {
      const content = await buildReservationMessengerContent(
        reservationId,
        restaurant,
        messengerTitle,
        { includeSpecialRequest: payload.type !== 'reservation_cancelled' },
      );
      await sendElevaroMerchantNotification({
        platformUserIds: messengerUserIds,
        eventType: payload.type,
        resourceType: 'reservation',
        resourceId: reservationId,
        idempotencyKey: `${payload.type}:${reservationId}`,
        title: content.title,
        body: content.body,
        payload: {
          ...content.payload,
          ...(payload.data ?? {}),
        },
        actions: [...actions],
        openUrl,
      });
    })();
  }
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
        const when = formatDateTimeInTimeZone(
          reservation.slotStart,
          restaurantTimeZone(restaurant ?? {}),
        );
        await notifyUser(
          reservation.dinerId.toString(),
          {
            type: 'reservation_reminder',
            title: `Reservation in ${hours}h`,
            body: `Reminder: ${restaurant?.name ?? 'Restaurant'} at ${when}`,
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
