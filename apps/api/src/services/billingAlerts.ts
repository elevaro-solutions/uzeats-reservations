import { Invoice } from '../models/Invoice.js';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { logger } from '../lib/logger.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { notifyUser } from './notifications.js';
import {
  markStripeInvoicePaidOutOfBand,
  STRIPE_LOCAL_INVOICE_SOURCE,
  type ChargeFailure,
} from './stripe.js';

const ADMIN_ALERT_ROLES = ['admin', 'super_admin', 'account_manager'];
const TRIAL_REMINDER_DAYS = 3;
const CARD_EXPIRY_NOTICE_DAYS = 30;

export const DEFAULT_CARD_PATH = '/billing?section=payment-method';

function dashboardUrl(path: string) {
  return `${process.env.DASHBOARD_URL || 'https://dashboard.tablevera.online'}${path}`;
}

function formatMoney(cents: number, currency = 'usd') {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
}

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function cardText(card: { brand?: string | null; last4?: string | null } | null | undefined) {
  if (!card?.last4) return 'card on file';
  const brand = card.brand ? card.brand.replace(/^./, (s) => s.toUpperCase()) : 'Card';
  return `${brand} •••• ${card.last4}`;
}

async function sendTemplated(input: {
  userId: string;
  type: string;
  template: string;
  vars: Record<string, string>;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  let subject = input.title;
  let htmlBody: string | undefined;
  let emailText = input.body;
  try {
    const rendered = await renderEmailTemplate(input.template, input.vars);
    subject = rendered.subject || subject;
    htmlBody = rendered.bodyHtml;
    emailText = rendered.bodyText || emailText;
  } catch {
    // Template may not be seeded yet; fall back to inline copy.
  }
  await notifyUser(input.userId, {
    type: input.type,
    title: input.title,
    body: input.body,
    emailSubject: subject,
    emailText,
    htmlBody,
    data: input.data,
  });
}

async function venueOwner(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).select('name ownerId');
  if (!restaurant?.ownerId) return null;
  const owner = await User.findById(restaurant.ownerId).select('firstName');
  return {
    restaurantName: restaurant.name,
    ownerId: restaurant.ownerId.toString(),
    firstName: owner?.firstName || 'there',
  };
}

export async function notifyOwnerChargeFailed(input: {
  restaurantId: string;
  amountCents: number;
  currency?: string | null;
  /** e.g. "invoice INV-1042" or "your subscription renewal". */
  chargeLabel: string;
  failure: ChargeFailure;
  nextAttemptAt?: Date | null;
  payUrl?: string | null;
  invoiceId?: string;
}) {
  const venue = await venueOwner(input.restaurantId);
  if (!venue) return false;
  const { failure } = input;
  const headline = failure.actionRequired
    ? `Your bank needs you to confirm the payment for ${input.chargeLabel}`
    : `We could not charge your card for ${input.chargeLabel}`;
  const body = failure.actionRequired
    ? 'Open the payment link and confirm it with your bank. Until then the charge stays unpaid.'
    : failure.hardDecline
      ? `${failure.reason}. This card cannot be charged again — replace it and we will retry open charges right away.`
      : input.nextAttemptAt
        ? `${failure.reason}. We will try again on ${formatDay(input.nextAttemptAt)}. Replace the card or pay now to avoid fees and listing limits.`
        : `${failure.reason}. Replace the card or pay now to avoid fees and listing limits.`;
  const cardUrl = dashboardUrl(DEFAULT_CARD_PATH);
  const payUrl = input.payUrl || dashboardUrl('/billing');
  await sendTemplated({
    userId: venue.ownerId,
    type: failure.actionRequired ? 'card_action_required' : 'card_charge_failed',
    template: failure.actionRequired ? 'card_action_required' : 'card_charge_failed',
    title: headline,
    body,
    vars: {
      firstName: venue.firstName,
      restaurantName: venue.restaurantName,
      headline,
      body,
      amount: formatMoney(input.amountCents, input.currency ?? 'usd'),
      reason: failure.reason,
      nextAttempt: failure.hardDecline
        ? 'Paused until you replace the card'
        : input.nextAttemptAt
          ? formatDay(input.nextAttemptAt)
          : '—',
      cardUrl,
      payUrl,
    },
    data: {
      restaurantId: input.restaurantId,
      invoiceId: input.invoiceId,
      declineCode: failure.declineCode,
      url: failure.actionRequired ? payUrl : DEFAULT_CARD_PATH,
    },
  });
  return true;
}

export async function notifyBillingAdmins(input: {
  restaurantId: string;
  headline: string;
  body: string;
  amountCents?: number;
  currency?: string | null;
  data?: Record<string, unknown>;
}) {
  const restaurant = await Restaurant.findById(input.restaurantId).select('name');
  const admins = await User.find({ role: { $in: ADMIN_ALERT_ROLES } }).select('_id firstName');
  const adminUrl = dashboardUrl('/admin/billing?section=failed-charges');
  for (const admin of admins) {
    try {
      await sendTemplated({
        userId: admin._id.toString(),
        type: 'billing_admin_alert',
        template: 'billing_admin_alert',
        title: input.headline,
        body: input.body,
        vars: {
          firstName: admin.firstName || 'there',
          restaurantName: restaurant?.name ?? 'Restaurant',
          headline: input.headline,
          body: input.body,
          amount:
            input.amountCents != null ? formatMoney(input.amountCents, input.currency ?? 'usd') : '—',
          adminUrl,
        },
        data: { restaurantId: input.restaurantId, url: '/admin/billing?section=failed-charges', ...input.data },
      });
    } catch (err) {
      logger.warn({ err, adminId: admin._id.toString() }, 'billing admin alert failed');
    }
  }
  return admins.length;
}

/** Stripe-owned renewal charge failed (Stripe Smart Retries handle the retry schedule). */
export async function handleStripeInvoicePaymentFailed(stripeInvoice: {
  id: string;
  amount_due?: number | null;
  currency?: string | null;
  attempt_count?: number | null;
  next_payment_attempt?: number | null;
  hosted_invoice_url?: string | null;
  metadata?: Record<string, string> | null;
}) {
  if (stripeInvoice.metadata?.source === STRIPE_LOCAL_INVOICE_SOURCE) return;
  const doc = await Invoice.findOne({ stripeInvoiceId: stripeInvoice.id });
  if (!doc) return;
  const restaurantId = doc.restaurantId.toString();
  const now = new Date();

  await Subscription.updateOne(
    { restaurantId, pastDueSince: { $exists: false } },
    { $set: { pastDueSince: now } },
  );

  const failure: ChargeFailure = {
    reason: 'The bank declined the renewal charge',
    declineCode: null,
    hardDecline: false,
    actionRequired: false,
  };
  const nextAttemptAt = stripeInvoice.next_payment_attempt
    ? new Date(stripeInvoice.next_payment_attempt * 1000)
    : null;
  doc.source = 'stripe_subscription';
  doc.autoChargeAttempts = stripeInvoice.attempt_count ?? (doc.autoChargeAttempts ?? 0) + 1;
  doc.autoChargeAttemptedAt = now;
  doc.autoChargeError = failure.reason;
  const firstFailure = !doc.autoChargeFailureNotifiedAt;
  if (firstFailure) doc.autoChargeFailureNotifiedAt = now;
  await doc.save();
  if (!firstFailure) return;

  const amountCents = stripeInvoice.amount_due ?? doc.totalCents;
  await notifyOwnerChargeFailed({
    restaurantId,
    amountCents,
    currency: stripeInvoice.currency ?? doc.currency,
    chargeLabel: 'your subscription renewal',
    failure,
    nextAttemptAt,
    payUrl: stripeInvoice.hosted_invoice_url,
    invoiceId: doc._id.toString(),
  });
  await notifyBillingAdmins({
    restaurantId,
    headline: 'Subscription renewal charge failed',
    body: nextAttemptAt
      ? `Stripe will retry on ${formatDay(nextAttemptAt)}. The owner was asked to replace the card.`
      : 'Stripe has no further retries scheduled. The owner was asked to replace the card.',
    amountCents,
    currency: stripeInvoice.currency ?? doc.currency,
    data: { invoiceId: doc._id.toString(), kind: 'renewal' },
  });
}

/** Bank requires 3D Secure on a Stripe renewal — only the owner can complete it. */
export async function handleStripeInvoiceActionRequired(stripeInvoice: {
  id: string;
  amount_due?: number | null;
  currency?: string | null;
  hosted_invoice_url?: string | null;
  metadata?: Record<string, string> | null;
}) {
  if (stripeInvoice.metadata?.source === STRIPE_LOCAL_INVOICE_SOURCE) return;
  const doc = await Invoice.findOne({ stripeInvoiceId: stripeInvoice.id });
  if (!doc) return;
  await notifyOwnerChargeFailed({
    restaurantId: doc.restaurantId.toString(),
    amountCents: stripeInvoice.amount_due ?? doc.totalCents,
    currency: stripeInvoice.currency ?? doc.currency,
    chargeLabel: 'your subscription renewal',
    failure: {
      reason: 'The bank needs you to confirm this payment',
      declineCode: 'authentication_required',
      hardDecline: false,
      actionRequired: true,
    },
    payUrl: stripeInvoice.hosted_invoice_url,
    invoiceId: doc._id.toString(),
  });
}

/** Card network updated the card (new expiry / number): refresh the cached summary. */
export async function handleStripePaymentMethodUpdated(pm: {
  id: string;
  card?: { brand?: string | null; last4?: string | null; exp_month?: number | null; exp_year?: number | null } | null;
}) {
  if (!pm.card) return;
  await Subscription.updateMany(
    { preferredPaymentMethodId: pm.id },
    {
      $set: {
        defaultCard: {
          brand: pm.card.brand ?? undefined,
          last4: pm.card.last4 ?? undefined,
          expMonth: pm.card.exp_month ?? undefined,
          expYear: pm.card.exp_year ?? undefined,
        },
      },
      $unset: { cardExpiryNoticeKey: '' },
    },
  );
}

function cardExpiryKey(expMonth: number, expYear: number) {
  return `${expYear}-${String(expMonth).padStart(2, '0')}`;
}

async function sendCardExpiryNotice(
  sub: InstanceType<typeof Subscription>,
  card: { brand?: string | null; last4?: string | null; expMonth: number; expYear: number },
) {
  const key = cardExpiryKey(card.expMonth, card.expYear);
  if (sub.cardExpiryNoticeKey === key) return false;
  const venue = await venueOwner(sub.restaurantId.toString());
  if (!venue) return false;
  const expiry = new Date(Date.UTC(card.expYear, card.expMonth - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const title = `Your card for ${venue.restaurantName} expires soon`;
  const body = `${cardText(card)} expires at the end of ${expiry}. Update it so automatic charges keep working.`;
  await sendTemplated({
    userId: venue.ownerId,
    type: 'card_expiring',
    template: 'card_expiring',
    title,
    body,
    vars: {
      firstName: venue.firstName,
      restaurantName: venue.restaurantName,
      card: cardText(card),
      expiry,
      cardUrl: dashboardUrl(DEFAULT_CARD_PATH),
    },
    data: { restaurantId: sub.restaurantId.toString(), url: DEFAULT_CARD_PATH },
  });
  sub.cardExpiryNoticeKey = key;
  await sub.save();
  return true;
}

/** Legacy card sources: Stripe warns ~1 month before expiry. */
export async function handleStripeSourceExpiring(card: {
  customer?: string | { id?: string } | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
}) {
  const customerId = typeof card.customer === 'string' ? card.customer : card.customer?.id;
  if (!customerId || !card.exp_month || !card.exp_year) return;
  const subs = await Subscription.find({ stripeCustomerId: customerId });
  for (const sub of subs) {
    await sendCardExpiryNotice(sub, {
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
    });
  }
}

/** Warn owners whose cached default card expires within ~30 days (once per expiry). */
export async function sendCardExpiryNotices(now = new Date()) {
  const subs = await Subscription.find({
    status: { $in: ['trialing', 'active', 'past_due'] },
    'defaultCard.expYear': { $exists: true },
  }).limit(500);
  let sent = 0;
  for (const sub of subs) {
    const card = sub.defaultCard;
    if (!card?.expMonth || !card.expYear) continue;
    const expiresAt = new Date(Date.UTC(card.expYear, card.expMonth, 0, 23, 59, 59));
    const daysLeft = (expiresAt.getTime() - now.getTime()) / 86_400_000;
    if (daysLeft > CARD_EXPIRY_NOTICE_DAYS) continue;
    try {
      if (
        await sendCardExpiryNotice(sub, {
          brand: card.brand,
          last4: card.last4,
          expMonth: card.expMonth,
          expYear: card.expYear,
        })
      ) {
        sent += 1;
      }
    } catch (err) {
      logger.warn({ err, restaurantId: String(sub.restaurantId) }, 'card expiry notice failed');
    }
  }
  return sent;
}

/** Trials ending within 3 days with no default card: remind the owner once per trial. */
export async function sendTrialCardReminders(now = new Date()) {
  const { resolveVenueDefaultPaymentMethodId } = await import('./defaultPaymentMethod.js');
  const horizon = new Date(now.getTime() + TRIAL_REMINDER_DAYS * 86_400_000);
  const subs = await Subscription.find({
    status: 'trialing',
    trialEndsAt: { $gt: now, $lte: horizon },
    trialCardReminderSentAt: { $exists: false },
  }).limit(500);
  let sent = 0;
  for (const sub of subs) {
    try {
      const restaurantId = sub.restaurantId.toString();
      if (await resolveVenueDefaultPaymentMethodId(restaurantId)) continue;
      const venue = await venueOwner(restaurantId);
      if (!venue || !sub.trialEndsAt) continue;
      const trialEndsOn = formatDay(sub.trialEndsAt);
      await sendTemplated({
        userId: venue.ownerId,
        type: 'trial_card_missing',
        template: 'trial_card_missing',
        title: `Your trial ends ${trialEndsOn} — add a card`,
        body: `Add a default card for ${venue.restaurantName} so your subscription, cover fees, and add-ons keep working.`,
        vars: {
          firstName: venue.firstName,
          restaurantName: venue.restaurantName,
          trialEndsOn,
          cardUrl: dashboardUrl(DEFAULT_CARD_PATH),
        },
        data: { restaurantId, url: DEFAULT_CARD_PATH },
      });
      sub.trialCardReminderSentAt = now;
      await sub.save();
      sent += 1;
    } catch (err) {
      logger.warn({ err, restaurantId: String(sub.restaurantId) }, 'trial card reminder failed');
    }
  }
  return sent;
}

/** Retry "paid out of band" on Stripe mirrors so Stripe never charges an invoice we already collected. */
export async function retryPendingStripeOutOfBand() {
  const pending = await Invoice.find({ stripeOutOfBandPending: true, status: 'paid' }).limit(200);
  let fixed = 0;
  for (const doc of pending) {
    if (!doc.stripeInvoiceId || (await markStripeInvoicePaidOutOfBand(doc.stripeInvoiceId))) {
      doc.stripeOutOfBandPending = false;
      await doc.save();
      fixed += 1;
    }
  }
  return { pending: pending.length, fixed };
}

export async function runBillingAlertJobs(now = new Date()) {
  const outOfBand = await retryPendingStripeOutOfBand();
  const trialReminders = await sendTrialCardReminders(now);
  const cardExpiryNotices = await sendCardExpiryNotices(now);
  return { outOfBand, trialReminders, cardExpiryNotices };
}
