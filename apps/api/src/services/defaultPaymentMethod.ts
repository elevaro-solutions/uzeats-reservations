import { env } from '../config/env.js';
import { ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Subscription } from '../models/Subscription.js';
import { logAudit } from './audit.js';
import { ensureSubscriptionStripeCustomer } from './invoices.js';
import {
  createDefaultCardSetupIntent,
  describePaymentCard,
  payOpenSubscriptionInvoice,
  resolveCustomerDefaultPaymentMethodId,
  retrieveSetupIntentPaymentMethod,
  setDefaultPaymentMethod,
  type PaymentCardSummary,
} from './stripe.js';

async function requireVenueSubscription(restaurantId: string) {
  const sub = await Subscription.findOne({ restaurantId });
  if (!sub) throw new ValidationError('Choose a plan before adding a payment method');
  return sub;
}

/**
 * Card-only SetupIntent for the venue's default card. That card is charged off-session for
 * subscription renewals, period invoices (cover fees), and paid add-ons (SMS, 3D room).
 */
export async function startDefaultPaymentMethodSetup(restaurantId: string) {
  const sub = await requireVenueSubscription(restaurantId);
  const customerId = await ensureSubscriptionStripeCustomer(sub);
  if (!customerId) throw new ValidationError('Restaurant not found');
  const intent = await createDefaultCardSetupIntent({
    customerId,
    metadata: { restaurantId, kind: 'default_payment_method' },
  });
  return { clientSecret: intent.client_secret ?? null, paymentMode: 'setup' as const };
}

export async function confirmDefaultPaymentMethod(input: {
  restaurantId: string;
  setupIntentId?: string | null;
  actorId: string;
}) {
  const sub = await requireVenueSubscription(input.restaurantId);
  const customerId = await ensureSubscriptionStripeCustomer(sub);
  if (!customerId) throw new ValidationError('Restaurant not found');

  let paymentMethodId: string | null = null;
  if (input.setupIntentId) {
    paymentMethodId = await retrieveSetupIntentPaymentMethod({
      setupIntentId: input.setupIntentId,
      customerId,
    });
  } else if (!customerId.startsWith('cus_dev_')) {
    // 3DS redirect or demo-mode Continue: use whatever card Stripe now has on file.
    paymentMethodId = await resolveCustomerDefaultPaymentMethodId(customerId);
  } else if (env.NODE_ENV !== 'production') {
    paymentMethodId = `pm_dev_${Date.now()}`;
  }
  if (!paymentMethodId) throw new ValidationError('No card found. Add a card and try again.');

  await setDefaultPaymentMethod({
    customerId,
    paymentMethodId,
    subscriptionId: sub.stripeSubscriptionId,
  });

  const card = await describePaymentCard(paymentMethodId);
  sub.preferredPaymentMethodId = paymentMethodId;
  sub.autoChargeInvoices = true;
  sub.set('defaultCard', cardFields(card));
  sub.set('cardExpiryNoticeKey', undefined);
  await sub.save();

  await logAudit({
    actorId: input.actorId,
    action: 'setDefaultPaymentMethod',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: { restaurantId: input.restaurantId },
  });

  const retried = await retryOpenChargesAfterCardChange(input.restaurantId);
  logger.info({ restaurantId: input.restaurantId, retried }, 'retried open charges after card change');
  return (await Subscription.findById(sub._id)) ?? sub;
}

function cardFields(card: PaymentCardSummary) {
  return {
    brand: card.brand ?? undefined,
    last4: card.last4 ?? undefined,
    expMonth: card.expMonth ?? undefined,
    expYear: card.expYear ?? undefined,
  };
}

/**
 * New default card: charge due local invoices now (ignoring the retry schedule and any
 * hard-decline pause) and ask Stripe to retry an open renewal invoice.
 */
export async function retryOpenChargesAfterCardChange(restaurantId: string) {
  const { autoChargeDueInvoices } = await import('./invoices.js');
  let invoices: Awaited<ReturnType<typeof autoChargeDueInvoices>> | null = null;
  let renewalRetried = false;
  try {
    invoices = await autoChargeDueInvoices(new Date(), { restaurantId, force: true });
  } catch (err) {
    logger.warn({ err, restaurantId }, 'invoice retry after card change failed');
  }
  const sub = await Subscription.findOne({ restaurantId }).select('stripeSubscriptionId');
  if (sub?.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith('sub_dev_')) {
    try {
      await payOpenSubscriptionInvoice(sub.stripeSubscriptionId);
      renewalRetried = true;
    } catch (err) {
      logger.warn({ err, restaurantId }, 'renewal retry after card change failed');
    }
  }
  return { invoices, renewalRetried };
}

/**
 * Venue default card id. Backfills `preferredPaymentMethodId` from Stripe for cards saved
 * outside this flow (signup / add-restaurant Payment Element, 3DS redirects).
 */
export async function resolveVenueDefaultPaymentMethodId(
  restaurantId: string,
): Promise<string | null> {
  const sub = await Subscription.findOne({ restaurantId }).select(
    'preferredPaymentMethodId stripeCustomerId stripeSubscriptionId',
  );
  if (!sub) return null;
  if (sub.preferredPaymentMethodId) return sub.preferredPaymentMethodId;
  if (!sub.stripeCustomerId || sub.stripeCustomerId.startsWith('cus_dev_')) return null;
  try {
    const paymentMethodId = await resolveCustomerDefaultPaymentMethodId(sub.stripeCustomerId);
    if (!paymentMethodId) return null;
    await setDefaultPaymentMethod({
      customerId: sub.stripeCustomerId,
      paymentMethodId,
      subscriptionId: sub.stripeSubscriptionId,
    });
    const card = await describePaymentCard(paymentMethodId);
    await Subscription.updateOne(
      { _id: sub._id },
      { $set: { preferredPaymentMethodId: paymentMethodId, defaultCard: cardFields(card) } },
    );
    return paymentMethodId;
  } catch (err) {
    logger.warn({ err, restaurantId }, 'could not resolve venue default payment method');
    return null;
  }
}

export async function describeVenueDefaultCard(
  restaurantId: string,
): Promise<PaymentCardSummary | null> {
  const paymentMethodId = await resolveVenueDefaultPaymentMethodId(restaurantId);
  if (!paymentMethodId) return null;
  const card = await describePaymentCard(paymentMethodId);
  if (card.last4) {
    await Subscription.updateOne(
      { restaurantId, preferredPaymentMethodId: paymentMethodId, 'defaultCard.last4': { $exists: false } },
      { $set: { defaultCard: cardFields(card) } },
    );
  }
  return card;
}
