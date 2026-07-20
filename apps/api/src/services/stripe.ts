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

export async function createStripeSubscription(input: {
  customerId: string;
  priceAmountCents: number;
  trialDays?: number;
  metadata: Record<string, string>;
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
    };
  }

  const price = await client.prices.create({
    currency: env.STRIPE_CURRENCY,
    unit_amount: input.priceAmountCents,
    recurring: { interval: 'month' },
    product_data: { name: 'Tablevera Plan' },
  });

  const subscription = await client.subscriptions.create({
    customer: input.customerId,
    items: [{ price: price.id }],
    trial_period_days: input.trialDays,
    metadata: input.metadata,
  });
  return { ...subscription, isStub: false as const };
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, status: 'cancelled' };
  }
  return client.subscriptions.cancel(subscriptionId);
}

export async function updateStripeSubscription(
  subscriptionId: string,
  priceAmountCents: number,
) {
  const client = getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) {
    return { id: subscriptionId, status: 'active' };
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
  return client.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: price.id }],
    proration_behavior: 'create_prorations',
  });
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
