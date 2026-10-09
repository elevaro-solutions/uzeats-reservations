import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { getEffectivePlan } from './platformConfig.js';
import {
  createStripeCustomer,
  createStripeSubscription,
  stripeSubscriptionExists,
  type StripeSubscriptionPayment,
} from './stripe.js';
import { logAudit } from './audit.js';
import { ConflictError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type CreatedRestaurantSubscription = SubscriptionDocument & StripeSubscriptionPayment;

async function existingBlocksCreate(existing: SubscriptionDocument): Promise<boolean> {
  if (existing.status === 'cancelled') return false;
  const stripeId = existing.stripeSubscriptionId;
  if (!stripeId || String(stripeId).startsWith('sub_dev_')) return false;
  return stripeSubscriptionExists(stripeId);
}

export async function createRestaurantSubscription(input: {
  restaurantId: string;
  plan: string;
  customerEmail?: string;
  customerName: string;
  actorId?: string;
  collectPaymentMethod?: boolean;
}): Promise<CreatedRestaurantSubscription> {
  const planDef = await getEffectivePlan(input.plan);
  if (!planDef) throw new ValidationError(`Invalid plan: ${input.plan}`);
  const planKey = planDef.key;

  const existing = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (existing && (await existingBlocksCreate(existing))) {
    throw new ConflictError('Subscription already exists for this restaurant');
  }

  if (existing) {
    logger.info(
      {
        restaurantId: input.restaurantId,
        previousStatus: existing.status,
        previousStripeSubscriptionId: existing.stripeSubscriptionId,
      },
      'Replacing local subscription with no live Stripe subscription (cancelled or mode-switch orphan)',
    );
  }

  const customer = await createStripeCustomer({
    email: input.customerEmail,
    name: input.customerName,
    metadata: { restaurantId: input.restaurantId },
  });

  const collectPaymentMethod =
    Boolean(input.collectPaymentMethod) && planDef.monthlyPriceCents > 0;

  const stripeSub = await createStripeSubscription({
    customerId: customer.id,
    priceAmountCents: planDef.monthlyPriceCents,
    trialDays: planDef.trialDays || undefined,
    metadata: { restaurantId: input.restaurantId, plan: planKey },
    collectPaymentMethod,
  });

  const fields = {
    restaurantId: input.restaurantId,
    plan: planKey,
    status: planDef.trialDays ? ('trialing' as const) : ('active' as const),
    stripeCustomerId: customer.id,
    stripeSubscriptionId: stripeSub.id,
    currentPeriodStart: stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : new Date(Date.now() + 30 * 86_400_000),
    trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : undefined,
    amountDueCents: 0,
    monthlyPriceCents: planDef.monthlyPriceCents,
    networkCoverFeeCents: planDef.networkCoverFeeCents,
    websiteCoverFeeCents: planDef.websiteCoverFeeCents,
    features: { ...planDef.features },
  };

  let sub: SubscriptionDocument;
  if (existing) {
    Object.assign(existing, fields);
    existing.set('preferredPaymentMethodId', undefined);
    existing.set('cancelledAt', undefined);
    existing.set('pendingPlan', undefined);
    existing.set('pendingPlanEffectiveAt', undefined);
    existing.set('lastPaidPlanChangeAt', undefined);
    if (!stripeSub.trial_end) existing.set('trialEndsAt', undefined);
    sub = await existing.save();
  } else {
    sub = await Subscription.create(fields);
  }

  if (input.actorId) {
    await logAudit({
      actorId: input.actorId,
      action: 'createSubscription',
      resource: 'Subscription',
      resourceId: sub._id.toString(),
      details: { plan: planKey, restaurantId: input.restaurantId, replaced: Boolean(existing) },
    });
  }

  return Object.assign(sub, {
    clientSecret: stripeSub.clientSecret ?? null,
    paymentMode: stripeSub.paymentMode ?? null,
  }) as CreatedRestaurantSubscription;
}
