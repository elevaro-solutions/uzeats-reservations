import Stripe from 'stripe';
import { env } from '../config/env.js';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { User } from '../models/User.js';
import { AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type StripeMode = 'test' | 'live';

class PaymentUnavailableError extends AppError {
  constructor(message = 'Payment processing unavailable') {
    super(message, 'PAYMENT_UNAVAILABLE', 503);
  }
}

/**
 * Maps Stripe SDK errors to AppError so GraphQL keeps a useful message in production.
 * Returns null for non-Stripe errors.
 */
export function formatStripeError(err: unknown): AppError | null {
  if (!(err instanceof Stripe.errors.StripeError)) return null;
  const details = err.code ? { stripeCode: err.code } : undefined;
  switch (err.type) {
    case 'StripeCardError':
      return new AppError(err.message || 'Your card was declined.', 'PAYMENT_DECLINED', 402, details);
    case 'StripeInvalidRequestError':
      return new AppError(
        `Payment provider rejected the request: ${err.message}`,
        'PAYMENT_PROVIDER_ERROR',
        400,
        details,
      );
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      return new PaymentUnavailableError(
        'Payment processing is misconfigured. Please contact support.',
      );
    case 'StripeRateLimitError':
    case 'StripeConnectionError':
    case 'StripeAPIError':
      return new PaymentUnavailableError(
        'Payment provider is temporarily unavailable. Please try again in a moment.',
      );
    default:
      return new AppError(
        'Payment provider error. Please try again or contact support.',
        'PAYMENT_PROVIDER_ERROR',
        502,
        details,
      );
  }
}

/** Process-local cache of PlatformConfig.stripeMode (refreshed from DB on TTL / setActiveStripeMode). */
let activeMode: StripeMode | null = null;
let modeCachedAt = 0;
const MODE_CACHE_TTL_MS = 5_000;
const clients = new Map<StripeMode, Stripe>();

export function defaultStripeMode(): StripeMode {
  return env.NODE_ENV === 'production' ? 'live' : 'test';
}

export function resolveStripeMode(stored?: string | null): StripeMode {
  if (stored === 'test' || stored === 'live') return stored;
  return defaultStripeMode();
}

export function setActiveStripeMode(mode: StripeMode) {
  activeMode = mode;
  modeCachedAt = Date.now();
}

export function getActiveStripeMode(): StripeMode {
  return activeMode ?? defaultStripeMode();
}

async function refreshActiveMode(): Promise<StripeMode> {
  if (activeMode && Date.now() - modeCachedAt < MODE_CACHE_TTL_MS) {
    return activeMode;
  }
  try {
    const doc = await PlatformConfig.findOne({ key: 'default' })
      .select('stripeMode')
      .lean<{ stripeMode?: string | null }>();
    const mode = resolveStripeMode(doc?.stripeMode);
    setActiveStripeMode(mode);
    return mode;
  } catch {
    return getActiveStripeMode();
  }
}

function secretForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_SECRET_KEY_TEST : env.STRIPE_SECRET_KEY_LIVE;
  if (specific) return specific;
  const legacy = env.STRIPE_SECRET_KEY;
  if (!legacy) return '';
  if (mode === 'test' && legacy.startsWith('sk_live_')) return '';
  if (mode === 'live' && legacy.startsWith('sk_test_')) return '';
  return legacy;
}

function webhookSecretForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_WEBHOOK_SECRET_TEST : env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (specific) return specific;
  return env.STRIPE_WEBHOOK_SECRET || '';
}

function publishableForMode(mode: StripeMode): string {
  const specific =
    mode === 'test' ? env.STRIPE_PUBLISHABLE_KEY_TEST : env.STRIPE_PUBLISHABLE_KEY_LIVE;
  if (specific) return specific;
  const legacy = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!legacy) return '';
  if (mode === 'test' && legacy.startsWith('pk_live_')) return '';
  if (mode === 'live' && legacy.startsWith('pk_test_')) return '';
  return legacy;
}

export function isStripeModeConfigured(mode: StripeMode): boolean {
  return Boolean(secretForMode(mode));
}

export function getStripePublishableKey(mode?: StripeMode): string {
  return publishableForMode(mode ?? getActiveStripeMode());
}

export async function getStripeClientConfig() {
  const mode = await refreshActiveMode();
  const publishableKey = publishableForMode(mode) || null;
  return {
    mode,
    publishableKey,
    sandboxConfigured: isStripeModeConfigured('test'),
    productionConfigured: isStripeModeConfigured('live'),
  };
}

async function getStripe() {
  const mode = await refreshActiveMode();
  const secret = secretForMode(mode);
  if (!secret) return null;
  let client = clients.get(mode);
  if (!client) {
    client = new Stripe(secret, { timeout: 20_000, maxNetworkRetries: 1 });
    clients.set(mode, client);
  }
  return client;
}

export async function createDepositIntent(input: {
  amountCents: number;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
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

/** Stripe customer for a diner's saved booking card in the active mode (created on first use). */
export async function ensureDinerStripeCustomer(dinerId: string): Promise<string> {
  const mode = await refreshActiveMode();
  const client = await getStripe();
  if (!client) return `cus_dev_${dinerId}`;
  const user = await User.findById(dinerId).select('email firstName lastName stripeCustomerIds');
  if (!user) throw new ValidationError('Diner not found');
  const existing = user.stripeCustomerIds?.[mode];
  if (existing) return existing;
  const customer = await client.customers.create({
    email: user.email ?? undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    metadata: { dinerId },
  });
  await User.updateOne({ _id: dinerId }, { $set: { [`stripeCustomerIds.${mode}`]: customer.id } });
  return customer.id;
}

/**
 * Charge-now booking payment (prepaid deposit / add-ons). When the booking also
 * carries a no-show fee, the same card is saved for a later off-session charge.
 */
export async function createPrepaymentIntent(input: {
  amountCents: number;
  metadata: Record<string, string>;
  customerId?: string;
  saveCardForOffSession?: boolean;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `pi_dev_${Date.now()}`;
    return { id, client_secret: `${id}_secret_dev`, isStub: true as const };
  }
  const intent = await client.paymentIntents.create({
    amount: input.amountCents,
    currency: env.STRIPE_CURRENCY,
    metadata: input.metadata,
    customer: input.customerId,
    setup_future_usage: input.saveCardForOffSession ? 'off_session' : undefined,
    automatic_payment_methods: { enabled: true },
  });
  return { ...intent, isStub: false as const };
}

/** Saves a card for a no-show fee without charging or holding anything. */
export async function createCardGuaranteeSetupIntent(input: {
  customerId: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
    }
    const id = `seti_dev_${Date.now()}`;
    return { id, client_secret: `${id}_secret_dev`, isStub: true as const };
  }
  const intent = await client.setupIntents.create({
    customer: input.customerId,
    usage: 'off_session',
    metadata: input.metadata,
    automatic_payment_methods: { enabled: true },
  });
  return { ...intent, isStub: false as const };
}

export function isSetupIntentId(intentId: string) {
  return intentId.startsWith('seti_');
}

export type BookingIntentState = {
  kind: 'payment' | 'setup';
  /** `succeeded` = paid or card saved; `requires_capture` = legacy authorization hold. */
  status: string;
  paymentMethodId: string | null;
};

/** Current Stripe state of a booking PaymentIntent or SetupIntent (stubs read as succeeded). */
export async function describeBookingIntent(intentId: string): Promise<BookingIntentState> {
  const kind = isSetupIntentId(intentId) ? 'setup' : 'payment';
  if (intentId.startsWith('pi_dev_') || intentId.startsWith('seti_dev_')) {
    if (env.NODE_ENV === 'production') throw new ValidationError('Invalid payment intent');
    return { kind, status: 'succeeded', paymentMethodId: 'pm_dev' };
  }
  const client = await getStripe();
  if (!client) throw new PaymentUnavailableError();
  const intent =
    kind === 'setup'
      ? await client.setupIntents.retrieve(intentId)
      : await client.paymentIntents.retrieve(intentId);
  const pm = intent.payment_method;
  return {
    kind,
    status: intent.status,
    paymentMethodId: typeof pm === 'string' ? pm : pm?.id ?? null,
  };
}

/** Drop an unused booking SetupIntent / PaymentIntent when the diner abandons the card form. */
export async function cancelBookingIntent(intentId: string) {
  if (intentId.startsWith('pi_dev_') || intentId.startsWith('seti_dev_')) return;
  const client = await getStripe();
  if (!client) return;
  try {
    if (isSetupIntentId(intentId)) {
      await client.setupIntents.cancel(intentId);
    } else {
      await client.paymentIntents.cancel(intentId);
    }
  } catch (err) {
    logger.warn({ err, intentId }, '[stripe] cancel booking intent failed');
  }
}

export async function retrieveSetupIntentClientSecret(setupIntentId: string) {
  if (setupIntentId.startsWith('seti_dev_')) return `${setupIntentId}_secret_dev`;
  const client = await getStripe();
  if (!client) return null;
  const intent = await client.setupIntents.retrieve(setupIntentId);
  return intent.client_secret ?? null;
}

export type OffSessionChargeResult =
  | { ok: true; paymentIntentId: string }
  | { ok: false; error: string; paymentIntentId?: string };

/**
 * Charge a saved card without the diner present (no-show / late-cancel fee).
 * Never throws for card problems — declines and SCA requirements come back as `ok: false`.
 */
export async function chargeOffSessionFee(input: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<OffSessionChargeResult> {
  const client = await getStripe();
  if (!client || input.customerId.startsWith('cus_dev_') || input.paymentMethodId === 'pm_dev') {
    return { ok: true, paymentIntentId: `pi_dev_fee_${Date.now()}` };
  }
  try {
    const intent = await client.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: env.STRIPE_CURRENCY,
        customer: input.customerId,
        payment_method: input.paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: input.metadata,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (intent.status === 'succeeded') return { ok: true, paymentIntentId: intent.id };
    return {
      ok: false,
      error: `Charge not completed (status: ${intent.status})`,
      paymentIntentId: intent.id,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      const raw = err.raw as { payment_intent?: { id?: string } } | undefined;
      return {
        ok: false,
        error: err.message || 'Card was declined',
        paymentIntentId: raw?.payment_intent?.id,
      };
    }
    throw err;
  }
}

/** One-off invoice payment (automatic capture). */
export async function createInvoicePaymentIntent(input: {
  amountCents: number;
  currency?: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
  if (!client) {
    if (env.NODE_ENV === 'production') {
      throw new PaymentUnavailableError();
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
    currency: (input.currency || env.STRIPE_CURRENCY).toLowerCase(),
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
      throw new ValidationError('Invalid payment intent');
    }
    return;
  }

  const client = await getStripe();
  if (!client) {
    throw new PaymentUnavailableError();
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  // Manual-capture deposits land in requires_capture; auto-capture / tickets may be succeeded.
  if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
    throw new ValidationError(`Payment not completed (status: ${intent.status})`);
  }
}

/** Invoice payments use automatic capture — require succeeded. */
export async function assertPaymentIntentSucceeded(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    if (env.NODE_ENV === 'production') {
      throw new ValidationError('Invalid payment intent');
    }
    return;
  }

  const client = await getStripe();
  if (!client) {
    throw new PaymentUnavailableError();
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new ValidationError(`Payment not completed (status: ${intent.status})`);
  }
}

export async function retrievePaymentIntentClientSecret(paymentIntentId: string) {
  if (isStubPaymentIntent(paymentIntentId)) {
    return `${paymentIntentId}_secret_dev`;
  }
  const client = await getStripe();
  if (!client) return null;
  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  return intent.client_secret ?? null;
}

/**
 * Release or refund a deposit PaymentIntent.
 * Manual-capture holds (`requires_capture`) are cancelled (full release only).
 * Captured charges support optional partial `amountCents`.
 */
export async function refundDeposit(
  paymentIntentId: string,
  amountCents?: number,
) {
  if (isStubPaymentIntent(paymentIntentId)) {
    return {
      id: 're_dev',
      mode: 'stub' as const,
      amountCents: amountCents ?? null,
    };
  }
  const client = await getStripe();
  if (!client) {
    return {
      id: 're_dev',
      mode: 'stub' as const,
      amountCents: amountCents ?? null,
    };
  }

  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  if (intent.status === 'canceled') {
    return { id: paymentIntentId, mode: 'already_canceled' as const, amountCents: null };
  }
  // Uncaptured authorization — cancel to release the hold (cannot partial-refund).
  if (intent.status === 'requires_capture') {
    if (amountCents != null && amountCents < intent.amount) {
      throw new ValidationError('Cannot partially release an authorization hold; release the full hold or capture first');
    }
    await client.paymentIntents.cancel(paymentIntentId);
    return { id: paymentIntentId, mode: 'released' as const, amountCents: intent.amount };
  }
  if (intent.status === 'succeeded') {
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amountCents != null) {
      if (amountCents <= 0) throw new ValidationError('Refund amount must be greater than 0');
      if (amountCents > intent.amount) {
        throw new ValidationError('Refund amount exceeds deposit');
      }
      params.amount = amountCents;
    }
    const refund = await client.refunds.create(params);
    return {
      id: refund.id,
      mode: 'refunded' as const,
      amountCents: refund.amount,
    };
  }
  throw new ValidationError(`Cannot refund payment intent in status ${intent.status}`);
}

export async function captureDeposit(paymentIntentId: string) {
  const client = await getStripe();
  if (!client || paymentIntentId.startsWith('pi_dev_')) return { id: paymentIntentId };
  return client.paymentIntents.capture(paymentIntentId);
}

export async function createStripeCustomer(input: {
  email?: string;
  name: string;
  metadata: Record<string, string>;
}) {
  const client = await getStripe();
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
  const client = await getStripe();
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
  const client = await getStripe();
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
  const client = await getStripe();
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
  const client = await getStripe();
  if (!client || subscriptionId.startsWith('sub_dev_')) return;
  const sub = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });
  const invoice = sub.latest_invoice;
  if (!invoice || typeof invoice !== 'object') return;
  if (invoice.status === 'open' && (invoice.amount_due ?? 0) > 0 && invoice.id) {
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
  const client = await getStripe();
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
  const client = await getStripe();
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
  if (!itemId) throw new AppError('Stripe subscription has no items', 'PAYMENT_PROVIDER_ERROR', 502);
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
  const client = await getStripe();
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
  const mode = await refreshActiveMode();
  const orderedModes: StripeMode[] = mode === 'live' ? ['live', 'test'] : ['test', 'live'];
  const secrets = orderedModes
    .map((m) => webhookSecretForMode(m))
    .filter((s, i, arr) => Boolean(s) && arr.indexOf(s) === i);

  if (secrets.length === 0) {
    throw new Error('Stripe webhook not configured');
  }

  // Any Stripe instance can verify signatures; prefer the active-mode client.
  const client =
    (await getStripe()) ??
    (secretForMode('test')
      ? new Stripe(secretForMode('test'), { timeout: 20_000, maxNetworkRetries: 1 })
      : secretForMode('live')
        ? new Stripe(secretForMode('live'), { timeout: 20_000, maxNetworkRetries: 1 })
        : null);
  if (!client) {
    throw new Error('Stripe webhook not configured');
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid Stripe webhook signature');
}

export async function listRecentStripeInvoices(limit = 50) {
  const client = await getStripe();
  if (!client) {
    return { invoices: [] as any[], stub: true as const };
  }
  const result = await client.invoices.list({ limit: Math.min(limit, 100) });
  return { invoices: result.data, stub: false as const };
}

export { getStripe };
