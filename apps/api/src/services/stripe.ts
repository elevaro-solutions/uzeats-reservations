import Stripe from 'stripe';
import { env } from '../config/env.js';

let stripe: Stripe | null = null;

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

export async function createDepositIntent(input: {
  amountCents: number;
  metadata: Record<string, string>;
}) {
  const client = getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Payment processing unavailable');
    }
    const id = `pi_dev_${Date.now()}`;
    return {
      id,
      client_secret: `${id}_secret_dev`,
      status: 'requires_payment_method',
      isStub: true as const,
    };
  }

  const intent = await client.paymentIntents.create({
    amount: input.amountCents,
    currency: env.STRIPE_CURRENCY,
    capture_method: 'manual',
    metadata: input.metadata,
    automatic_payment_methods: { enabled: true },
  });
  return { ...intent, isStub: false as const };
}

export function isStubPaymentIntent(paymentIntentId: string) {
  return paymentIntentId.startsWith('pi_dev_');
}

/**
 * Ensures a PaymentIntent was actually authorized/paid before confirming a booking.
 * Stub intents (`pi_dev_*`) are only allowed outside production.
 */
export async function assertPaymentIntentAuthorized(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Invalid payment intent');
    }
    return;
  }

  const client = getStripe();
  if (!client) {
    throw new Error('Payment processing unavailable');
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  // Manual-capture deposits land in requires_capture; auto-capture / tickets may be succeeded.
  if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
    throw new Error(`Payment not completed (status: ${intent.status})`);
  }
}

export async function retrievePaymentIntentClientSecret(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    return `${paymentIntentId}_secret_dev`;
  }
  const client = getStripe();
  if (!client) return null;
  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  return intent.client_secret ?? null;
}

export async function refundDeposit(paymentIntentId: string) {
  const client = getStripe();
  if (!client || paymentIntentId.startsWith('pi_dev_')) return { id: 're_dev' };
  return client.refunds.create({ payment_intent: paymentIntentId });
}

export async function captureDeposit(paymentIntentId: string) {
  const client = getStripe();
  if (!client || paymentIntentId.startsWith('pi_dev_')) return { id: paymentIntentId };
  return client.paymentIntents.capture(paymentIntentId);
}

export async function createStripeCustomer(input: {
  email?: string;
  name: string;
  metadata: Record<string, string>;
}) {
  const client = getStripe();
  if (!client) {
    return { id: `cus_dev_${Date.now()}`, isStub: true as const };
  }
  const customer = await client.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata,
  });
  return { ...customer, isStub: false as const };
}

export type StripeSubscriptionPayment = {
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
};

function extractSubscriptionPayment(sub: Stripe.Subscription): StripeSubscriptionPayment {
  const setup = sub.pending_setup_intent;
  if (setup && typeof setup === 'object' && setup.client_secret) {
    return { clientSecret: setup.client_secret, paymentMode: 'setup' };
  }
  const invoice = sub.latest_invoice;
  if (invoice && typeof invoice === 'object') {
    const raw = invoice as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
      confirmation_secret?: { client_secret?: string | null } | null;
    };
    const pi = raw.payment_intent;
    if (pi && typeof pi === 'object' && pi.client_secret) {
      return { clientSecret: pi.client_secret, paymentMode: 'payment' };
    }
    const confirmationSecret = raw.confirmation_secret?.client_secret;
    if (confirmationSecret) {
      return { clientSecret: confirmationSecret, paymentMode: 'payment' };
    }
  }
  return { clientSecret: null, paymentMode: null };
}

export async function createStripeSubscription(input: {
  customerId: string;
  priceAmountCents: number;
  trialDays?: number;
  metadata: Record<string, string>;
  /** When true, create an incomplete subscription and return a client secret for Payment Element. */
  collectPaymentMethod?: boolean;
}) {
  const client = getStripe();
  if (!client) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const trialEnd = input.trialDays
      ? new Date(now.getTime() + input.trialDays * 86_400_000)
      : undefined;
    return {
      id: `sub_dev_${Date.now()}`,
      status: input.trialDays ? ('trialing' as const) : ('active' as const),
      current_period_start: Math.floor(now.getTime() / 1000),
      current_period_end: Math.floor(periodEnd.getTime() / 1000),
      trial_end: trialEnd ? Math.floor(trialEnd.getTime() / 1000) : null,
      isStub: true as const,
      clientSecret: null as string | null,
      paymentMode: null as 'payment' | 'setup' | null,
    };
  }

  const collectPaymentMethod = Boolean(input.collectPaymentMethod) && input.priceAmountCents > 0;

  const price = await client.prices.create({
    currency: env.STRIPE_CURRENCY,
    unit_amount: input.priceAmountCents,
    recurring: { interval: 'month' },
    product_data: { name: 'Tablevera Plan' },
  });

  const subscription = await client.subscriptions.create({
    customer: input.customerId,
    items: [{ price: price.id }],
    trial_period_days: input.trialDays || undefined,
    payment_behavior: collectPaymentMethod ? 'default_incomplete' : undefined,
    payment_settings: collectPaymentMethod
      ? { save_default_payment_method: 'on_subscription' }
      : undefined,
    metadata: input.metadata,
    expand: collectPaymentMethod
      ? ['latest_invoice.payment_intent', 'pending_setup_intent']
      : undefined,
  });
  const payment = collectPaymentMethod
    ? extractSubscriptionPayment(subscription)
    : { clientSecret: null, paymentMode: null };
  return { ...subscription, isStub: false as const, ...payment };
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, status: 'cancelled' };
  }
  return client.subscriptions.cancel(subscriptionId);
}

function isMissingPaymentMethodError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /no attached payment source or default payment method/i.test(msg);
}

async function customerHasPaymentMethod(client: Stripe, customerId: string) {
  if (!customerId || customerId.startsWith('cus_dev_')) return false;
  const customer = await client.customers.retrieve(customerId);
  if (customer.deleted) return false;
  if (customer.invoice_settings?.default_payment_method) return true;
  if (customer.default_source) return true;
  const cards = await client.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return cards.data.length > 0;
}

async function createCustomerSetupIntent(client: Stripe, customerId: string) {
  const setup = await client.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
  });
  return {
    clientSecret: setup.client_secret ?? null,
    paymentMode: 'setup' as const,
  };
}

export async function attachLatestCardAsDefault(customerId: string, subscriptionId?: string) {
  const client = getStripe();
  if (!client || customerId.startsWith('cus_dev_')) return;
  const cards = await client.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  const paymentMethodId = cards.data[0]?.id;
  if (!paymentMethodId) return;
  await client.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  if (subscriptionId && !subscriptionId.startsWith('sub_dev_')) {
    await client.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }
}

export async function payOpenSubscriptionInvoice(subscriptionId: string) {
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) return;
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });
  const invoice = sub.latest_invoice;
  if (!invoice || typeof invoice !== 'object') return;
  if (invoice.status === 'open' && (invoice.amount_due ?? 0) > 0) {
    await client.invoices.pay(invoice.id);
  }
}

async function currentSubscriptionUnitAmount(client: Stripe, subscriptionId: string) {
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  const price = sub.items.data[0]?.price;
  return typeof price === 'object' ? price.unit_amount ?? null : null;
}

export async function syncPaidSubscriptionAfterCard(input: {
  customerId?: string;
  subscriptionId?: string;
  monthlyPriceCents: number;
}) {
  if (input.customerId) {
    await attachLatestCardAsDefault(input.customerId, input.subscriptionId);
  }
  if (!input.subscriptionId || input.monthlyPriceCents <= 0) return;
  const client = getStripe();
  if (client && !input.subscriptionId.startsWith('sub_dev_')) {
    const current = await currentSubscriptionUnitAmount(client, input.subscriptionId);
    if (current !== input.monthlyPriceCents) {
      await updateStripeSubscription(input.subscriptionId, input.monthlyPriceCents, {
        prorationBehavior: 'create_prorations',
      });
    }
  }
  await payOpenSubscriptionInvoice(input.subscriptionId);
}

export async function updateStripeSubscription(
  subscriptionId: string,
  priceAmountCents: number,
  options?: {
    prorationBehavior?: 'create_prorations' | 'none';
    collectPayment?: boolean;
  },
): Promise<{
  id: string;
  status?: string;
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
}> {
  const collectPayment = Boolean(options?.collectPayment && priceAmountCents > 0);
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return {
      id: subscriptionId,
      status: collectPayment ? 'incomplete' : 'active',
      clientSecret: collectPayment ? `pi_dev_${Date.now()}_secret_dev` : null,
      paymentMode: collectPayment ? 'setup' : null,
    };
  }
  const price = await client.prices.create({
    currency: env.STRIPE_CURRENCY,
    unit_amount: priceAmountCents,
    recurring: { interval: 'month' },
    product_data: { name: 'Tablevera Plan' },
  });

  const sub = await client.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) throw new Error('No subscription item found');
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const hasPm = Boolean(
    collectPayment &&
      (sub.default_payment_method || (customerId && (await customerHasPaymentMethod(client, customerId)))),
  );

  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [{ id: itemId, price: price.id }],
    proration_behavior: options?.prorationBehavior ?? 'create_prorations',
  };
  if (collectPayment) {
    // pending_if_incomplete cannot include payment_settings, and it requires a card on file.
    updateParams.payment_behavior = hasPm ? 'pending_if_incomplete' : 'allow_incomplete';
    updateParams.expand = ['latest_invoice.payment_intent', 'pending_setup_intent'];
  }

  let updated: Stripe.Subscription;
  try {
    updated = await client.subscriptions.update(subscriptionId, updateParams);
  } catch (err) {
    if (collectPayment && customerId && isMissingPaymentMethodError(err)) {
      const setup = await createCustomerSetupIntent(client, customerId);
      return {
        id: subscriptionId,
        status: 'incomplete',
        clientSecret: setup.clientSecret,
        paymentMode: setup.paymentMode,
      };
    }
    throw err;
  }

  if (!collectPayment) {
    return { id: updated.id, status: updated.status, clientSecret: null, paymentMode: null };
  }

  let payment = extractSubscriptionPayment(updated);
  if (!payment.clientSecret && customerId) {
    payment = await createCustomerSetupIntent(client, customerId);
  }
  return {
    id: updated.id,
    status: updated.status,
    clientSecret: payment.clientSecret,
    paymentMode: payment.paymentMode,
  };
}

export async function getOpenSubscriptionPayment(subscriptionId: string): Promise<{
  amountDueCents: number;
  clientSecret: string | null;
  paymentMode: 'payment' | 'setup' | null;
}> {
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { amountDueCents: 0, clientSecret: null, paymentMode: null };
  }
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
  });
  const invoice = sub.latest_invoice;
  const amountDueCents =
    invoice && typeof invoice === 'object' && invoice.status === 'open'
      ? invoice.amount_due ?? 0
      : 0;
  const payment = extractSubscriptionPayment(sub);
  return { amountDueCents, ...payment };
}

export async function constructStripeEvent(rawBody: Buffer, signature: string) {
  const client = getStripe();
  if (!client || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook not configured');
  }
  return client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

export async function listRecentStripeInvoices(limit = 50) {
  const client = getStripe();
  if (!client) {
    return { invoices: [] as any[], stub: true as const };
  }
  const result = await client.invoices.list({ limit: Math.min(limit, 100) });
  return { invoices: result.data, stub: false as const };
}

export { getStripe };
