import { Invoice } from '../models/Invoice.js';
import { Subscription } from '../models/Subscription.js';
import { getPlatformConfig } from './platformConfig.js';
import { mapInvoice } from './invoices.js';
import { logger } from '../lib/logger.js';

function mapStripeInvoiceStatus(
  status: string | null | undefined,
): 'upcoming' | 'pending' | 'paid' | 'canceled' | 'overdue' {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'void':
    case 'uncollectible':
      return 'canceled';
    case 'draft':
      return 'upcoming';
    case 'open':
      return 'pending';
    default:
      return 'pending';
  }
}

/** Sync a Stripe invoice object into our Invoice collection. */
export async function syncStripeInvoice(stripeInvoice: {
  id: string;
  status?: string | null;
  number?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  total?: number | null;
  due_date?: number | null;
  created?: number | null;
  status_transitions?: { paid_at?: number | null } | null;
  lines?: { data?: Array<{ description?: string | null; quantity?: number | null; amount?: number | null }> };
  metadata?: Record<string, string> | null;
  subscription?: string | { id?: string } | null;
  customer?: string | { id?: string } | null;
}) {
  const restaurantId =
    stripeInvoice.metadata?.restaurantId ||
    (await findRestaurantIdFromStripe(stripeInvoice));

  if (!restaurantId) {
    logger.warn({ stripeInvoiceId: stripeInvoice.id }, '[stripe] invoice without restaurantId');
    return null;
  }

  const config = await getPlatformConfig();
  const period =
    stripeInvoice.metadata?.billingPeriod ||
    new Date((stripeInvoice.created ?? Date.now() / 1000) * 1000).toISOString().slice(0, 7);

  const lines = (stripeInvoice.lines?.data ?? []).map((l) => ({
    description: l.description || 'Stripe line item',
    quantity: l.quantity ?? 1,
    unitAmountCents: l.quantity ? Math.round((l.amount ?? 0) / l.quantity) : l.amount ?? 0,
    amountCents: l.amount ?? 0,
  }));

  const status = mapStripeInvoiceStatus(stripeInvoice.status);
  const dueDate = stripeInvoice.due_date
    ? new Date(stripeInvoice.due_date * 1000)
    : new Date((stripeInvoice.created ?? Date.now() / 1000) * 1000);

  const number =
    stripeInvoice.number ||
    `${config.invoicePrefix || 'INV'}-STRIPE-${stripeInvoice.id.slice(-8).toUpperCase()}`;

  const doc = await Invoice.findOneAndUpdate(
    {
      $or: [
        { stripeInvoiceId: stripeInvoice.id },
        { restaurantId, billingPeriod: period, stripeInvoiceId: { $exists: false } },
      ],
    },
    {
      $set: {
        number,
        restaurantId,
        status,
        billingPeriod: period,
        currency: (stripeInvoice.currency || config.currency || 'usd').toLowerCase(),
        subtotalCents: stripeInvoice.subtotal ?? stripeInvoice.total ?? 0,
        totalCents: stripeInvoice.total ?? 0,
        lines: lines.length
          ? lines
          : [
              {
                description: `Stripe invoice ${number}`,
                quantity: 1,
                unitAmountCents: stripeInvoice.total ?? 0,
                amountCents: stripeInvoice.total ?? 0,
              },
            ],
        dueDate,
        paidAt:
          status === 'paid'
            ? stripeInvoice.status_transitions?.paid_at
              ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
              : new Date()
            : undefined,
        canceledAt: status === 'canceled' ? new Date() : undefined,
        stripeInvoiceId: stripeInvoice.id,
        notes: `Synced from Stripe ${stripeInvoice.id}`,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return doc ? mapInvoice(doc) : null;
}

async function findRestaurantIdFromStripe(stripeInvoice: {
  subscription?: string | { id?: string } | null;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
}) {
  const subId =
    typeof stripeInvoice.subscription === 'string'
      ? stripeInvoice.subscription
      : stripeInvoice.subscription?.id;
  if (subId) {
    const sub = await Subscription.findOne({ stripeSubscriptionId: subId });
    if (sub) return sub.restaurantId.toString();
  }
  const customerId =
    typeof stripeInvoice.customer === 'string'
      ? stripeInvoice.customer
      : stripeInvoice.customer?.id;
  if (customerId) {
    const sub = await Subscription.findOne({ stripeCustomerId: customerId });
    if (sub) return sub.restaurantId.toString();
  }
  return stripeInvoice.metadata?.restaurantId ?? null;
}

export async function handleStripeSubscriptionEvent(eventType: string, subscription: {
  id: string;
  status?: string;
  current_period_start?: number;
  current_period_end?: number;
  trial_end?: number | null;
  canceled_at?: number | null;
  metadata?: Record<string, string>;
}) {
  const sub = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (!sub) {
    logger.warn({ stripeSubId: subscription.id, eventType }, '[stripe] unknown subscription');
    return;
  }

  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    paused: 'paused',
  };

  if (subscription.status && statusMap[subscription.status]) {
    sub.status = statusMap[subscription.status] as any;
  }
  if (subscription.current_period_start) {
    sub.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  }
  if (subscription.current_period_end) {
    sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }
  if (subscription.trial_end) {
    sub.trialEndsAt = new Date(subscription.trial_end * 1000);
  }
  if (subscription.canceled_at) {
    sub.cancelledAt = new Date(subscription.canceled_at * 1000);
  }
  await sub.save();
}
