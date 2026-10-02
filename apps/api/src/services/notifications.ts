import { Queue, Worker } from 'bullmq';
import webpush from 'web-push';
import {
  formatDateTimeInTimeZone,
  restaurantTimeZone,
  DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPE_TO_EVENT,
  OCCASION_LABELS,
  REMINDER_LATE_CHECK_MAX_MINUTES,
  REMINDER_OFFSETS_MINUTES,
  RESERVATION_REMINDER_LATE_CATEGORY_ID,
  type NotificationChannel,
  type Occasion,
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
import {
  emailButton,
  emailDetailBox,
  emailLinkFallback,
  emailMuted,
  emailParagraph,
  textToEmailHtml,
  wrapEmailHtml,
} from './emailBranding.js';
import { sendElevaroMerchantNotification } from './elevaroNotifier.js';

export { wrapEmailHtml } from './emailBranding.js';

const EMPTY_FIELD = '—';

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_FIELD;
}

function formatOccasionLabel(occasion: string | null | undefined): string {
  if (!occasion) return OCCASION_LABELS.none;
  return OCCASION_LABELS[occasion as Occasion] ?? occasion;
}

function formatPartySizeLabel(partySize: number | string): string {
  const n = typeof partySize === 'number' ? partySize : Number(partySize);
  if (!Number.isFinite(n) || n <= 0) return String(partySize);
  return `${n} ${n === 1 ? 'guest' : 'guests'}`;
}

type ReservationAlertContent = {
  title: string;
  body: string;
  htmlBody: string;
  payload: Record<string, unknown>;
};

async function buildReservationAlertContent(
  reservationId: string,
  restaurant: (Parameters<typeof restaurantTimeZone>[0] & { name?: string | null }) | null,
  fallbackTitle: string,
  options?: { includeSpecialRequest?: boolean; openUrl?: string },
): Promise<ReservationAlertContent> {
  const includeSpecialRequest = options?.includeSpecialRequest !== false;
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const body = restaurant?.name ? String(restaurant.name) : EMPTY_FIELD;
    return {
      title: fallbackTitle,
      body,
      htmlBody: emailParagraph(body),
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
  const occasion = formatOccasionLabel(reservation.occasion);
  const when = formatDateTimeInTimeZone(
    reservation.slotStart,
    restaurantTimeZone(restaurant ?? {}),
  );
  const partySize = String(reservation.partySize);
  const partySizeLabel = formatPartySizeLabel(reservation.partySize);
  const restaurantName = displayOrDash(restaurant?.name);

  const lines = [
    `Restaurant: ${restaurantName}`,
    `Email: ${email}`,
    `Full name: ${displayOrDash(guestName)}`,
    `Table: ${tableNumber}`,
    `Phone: ${phone}`,
  ];
  if (includeSpecialRequest) {
    lines.push(`Special request: ${specialRequest}`);
  }
  lines.push(`Occasion: ${occasion}`, `Time: ${when}`, `Guests: ${partySize}`);

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Guest', value: displayOrDash(guestName) },
    { label: 'Email', value: email },
    { label: 'Phone', value: phone },
    { label: 'Restaurant', value: restaurantName },
    { label: 'Date & time', value: when },
    { label: 'Party size', value: partySizeLabel },
    { label: 'Occasion', value: occasion },
    { label: 'Table', value: tableNumber },
  ];
  if (reservation.packageTitle) {
    detailRows.push({ label: 'Package', value: reservation.packageTitle });
  }
  if (reservation.privateDiningSpaceName) {
    detailRows.push({ label: 'Private room', value: reservation.privateDiningSpaceName });
  }
  if (reservation.experienceTitle) {
    detailRows.push({ label: 'Experience', value: reservation.experienceTitle });
  }
  if (includeSpecialRequest) {
    detailRows.push({ label: 'Special requests', value: specialRequest });
  }

  const intro =
    fallbackTitle === 'New reservation'
      ? 'A new reservation just came in. Details:'
      : fallbackTitle === 'Reservation cancelled'
        ? 'A reservation was cancelled. Details:'
        : fallbackTitle === 'Reservation updated'
          ? 'A reservation was updated. Details:'
          : fallbackTitle === 'Reservation needs approval'
            ? 'A reservation is waiting for your approval. Details:'
            : `${fallbackTitle}. Details:`;

  const htmlParts = [emailParagraph(intro), emailDetailBox(detailRows)];
  if (options?.openUrl) {
    htmlParts.push(emailButton(options.openUrl, 'View reservation'));
    htmlParts.push(emailLinkFallback(options.openUrl));
  } else {
    htmlParts.push(emailMuted('Open Partner Hub to manage this reservation.'));
  }

  return {
    title: fallbackTitle,
    body: lines.join('\n'),
    htmlBody: htmlParts.join(''),
    payload: {
      reservationId,
      restaurantName: restaurant?.name ?? '',
      email,
      guestName: guestName || EMPTY_FIELD,
      tableNumber,
      phone,
      specialRequest,
      occasion,
      when,
      partySize,
    },
  };
}

const connection = { url: env.REDIS_URL };

export const notificationQueue = new Queue('notifications', { connection });
export const reminderQueue = new Queue('reminders', { connection });

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  } catch (err) {
    logger.warn({ err }, '[push] invalid VAPID keys; web push disabled');
  }
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
      // SendGrid 400s if type contains ';' or CRLF (e.g. "text/calendar; charset=utf-8").
      type: a.contentType.split(';')[0]!.trim(),
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
  categoryId?: string,
) {
  for (const t of tokens) {
    try {
      if (t.platform === 'web' && env.VAPID_PUBLIC_KEY) {
        await webpush.sendNotification(
          JSON.parse(t.token),
          JSON.stringify({ title, body, data, categoryId }),
        );
      } else {
        // Expo push — categoryId enables interactive Yes/No actions on iOS/Android
        // when the client registered the matching notification category.
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: t.token,
            title,
            body,
            data,
            ...(categoryId ? { categoryId } : {}),
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
    /** Expo / web-push interactive category (e.g. running-late Yes/No). */
    pushCategoryId?: string;
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
  } else if (payload.type === 'password_reset' || payload.type === 'email_verification') {
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
  // In-app inbox follows the Platform preference (except account security emails).
  if (
    payload.type !== 'password_reset' &&
    payload.type !== 'email_verification' &&
    channelPrefs.platform
  ) {
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
        await sendPush(
          user.pushTokens,
          payload.title,
          payload.body,
          payload.data,
          payload.pushCategoryId,
        );
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

const RESERVATION_ALERT_TYPES = new Set([
  'new_reservation',
  'reservation_cancelled',
  'reservation_updated',
  'reservation_needs_approval',
]);

const MESSENGER_ALERT_TYPES = new Set([
  'new_reservation',
  'reservation_cancelled',
  'reservation_updated',
]);

function reservationAlertTitle(type: string, fallback: string) {
  if (type === 'new_reservation') return 'New reservation';
  if (type === 'reservation_cancelled') return 'Reservation cancelled';
  if (type === 'reservation_updated') return 'Reservation updated';
  if (type === 'reservation_needs_approval') return 'Reservation needs approval';
  return fallback;
}

/** Notify a restaurant's owner (and linked staff accounts). */
export async function notifyRestaurantManagers(
  restaurantId: string,
  payload: {
    type: string;
    title: string;
    body: string;
    htmlBody?: string;
    data?: Record<string, unknown>;
  },
) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return;
  const staff = await User.find({
    $or: [{ _id: restaurant.ownerId }, { restaurantIds: restaurant._id }],
  }).select('_id role notificationPreferences');
  const staffIds = staff.map((u) => u._id.toString());
  const ownerId = restaurant.ownerId.toString();

  const reservationId =
    typeof payload.data?.reservationId === 'string'
      ? payload.data.reservationId
      : undefined;

  const openUrl =
    reservationId && env.DASHBOARD_APP_URL
      ? `${env.DASHBOARD_APP_URL.replace(/\/$/, '')}/reservations/${reservationId}`
      : undefined;

  const needsAlertContent =
    Boolean(reservationId) &&
    (RESERVATION_ALERT_TYPES.has(payload.type) || MESSENGER_ALERT_TYPES.has(payload.type));

  const alertContent =
    needsAlertContent && reservationId
      ? await buildReservationAlertContent(
          reservationId,
          restaurant,
          reservationAlertTitle(payload.type, payload.title),
          {
            includeSpecialRequest: payload.type !== 'reservation_cancelled',
            openUrl,
          },
        )
      : null;

  // Keep the short one-liner for push/SMS/in-app; put full details in email HTML.
  const htmlBody =
    payload.htmlBody ??
    (RESERVATION_ALERT_TYPES.has(payload.type) ? alertContent?.htmlBody : undefined);

  const staffPayload = {
    ...payload,
    htmlBody,
    data: { ...payload.data, restaurantId },
  };
  await Promise.all(
    staffIds.map((id) =>
      notifyUser(id, staffPayload, { smsRestaurantId: restaurantId }),
    ),
  );

  // Actionable messenger fan-out (Telegram / WhatsApp via Elevaro notifier)
  if (reservationId && alertContent && MESSENGER_ALERT_TYPES.has(payload.type)) {
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

    const actions =
      payload.type === 'new_reservation'
        ? (['accept', 'reject', 'open'] as const)
        : (['open'] as const);

    void sendElevaroMerchantNotification({
      platformUserIds: messengerUserIds,
      eventType: payload.type,
      resourceType: 'reservation',
      resourceId: reservationId,
      idempotencyKey: `${payload.type}:${reservationId}`,
      title: alertContent.title,
      body: alertContent.body,
      payload: {
        ...alertContent.payload,
        ...(payload.data ?? {}),
      },
      actions: [...actions],
      openUrl,
    });
  }
}

function formatReminderLead(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes} min`;
}

function reminderJobId(reservationId: string, minutes: number) {
  return `reminder-${reservationId}-${minutes}m`;
}

/** Remove pending reminder + no-show jobs (also clears legacy `*h` job ids). */
export async function cancelReservationReminders(reservationId: string) {
  const jobIds = [
    ...REMINDER_OFFSETS_MINUTES.map((m) => reminderJobId(reservationId, m)),
    // Legacy hour-based ids from before minute offsets
    `reminder-${reservationId}-24h`,
    `reminder-${reservationId}-2h`,
    `noshow-${reservationId}`,
  ];
  for (const jobId of jobIds) {
    try {
      const job = await reminderQueue.getJob(jobId);
      if (job) await job.remove();
    } catch (err) {
      logger.warn({ err, jobId }, '[reminders] failed to remove job');
    }
  }
}

export async function scheduleReservationReminders(reservationId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return;

  await cancelReservationReminders(reservationId);

  for (const minutes of REMINDER_OFFSETS_MINUTES) {
    const runAt = new Date(reservation.slotStart.getTime() - minutes * 60 * 1000);
    if (runAt <= new Date()) continue;
    await reminderQueue.add(
      'reservation-reminder',
      { reservationId, minutes },
      { delay: runAt.getTime() - Date.now(), jobId: reminderJobId(reservationId, minutes) },
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
        const data = job.data as {
          reservationId: string;
          minutes?: number;
          /** Legacy jobs scheduled with hour offsets. */
          hours?: number;
        };
        const { reservationId } = data;
        const minutes =
          typeof data.minutes === 'number'
            ? data.minutes
            : typeof data.hours === 'number'
              ? data.hours * 60
              : null;
        if (minutes == null) return;

        const reservation = await Reservation.findById(reservationId);
        if (!reservation || !['confirmed', 'pending'].includes(reservation.status)) return;
        const restaurant = await Restaurant.findById(reservation.restaurantId);
        const when = formatDateTimeInTimeZone(
          reservation.slotStart,
          restaurantTimeZone(restaurant ?? {}),
        );
        const lead = formatReminderLead(minutes);
        const askLate = minutes <= REMINDER_LATE_CHECK_MAX_MINUTES;
        await notifyUser(
          reservation.dinerId.toString(),
          {
            type: 'reservation_reminder',
            title: `Reservation in ${lead}`,
            body: askLate
              ? `Reminder: ${restaurant?.name ?? 'Restaurant'} at ${when}. Are you running late?`
              : `Reminder: ${restaurant?.name ?? 'Restaurant'} at ${when}`,
            data: {
              reservationId,
              minutes,
              askRunningLate: askLate,
            },
            ...(askLate
              ? { pushCategoryId: RESERVATION_REMINDER_LATE_CATEGORY_ID }
              : {}),
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
