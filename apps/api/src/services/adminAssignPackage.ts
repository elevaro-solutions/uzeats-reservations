import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { Restaurant } from '../models/Restaurant.js';
import { getEffectivePlan } from './platformConfig.js';
import { updateStripeSubscription } from './stripe.js';
import { createRestaurantSubscription } from './restaurantSubscription.js';
import { logAudit } from './audit.js';

const MONTH_MS = 30 * 86_400_000;

export function computeExtendedBillingPeriod(input: {
  now?: Date;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}): { currentPeriodStart: Date; currentPeriodEnd: Date; extendedFrom: Date } {
  const now = input.now ?? new Date();
  const prevStart = input.currentPeriodStart ?? null;
  const prevEnd = input.currentPeriodEnd ?? null;

  let periodMs = MONTH_MS;
  if (prevStart && prevEnd && prevEnd.getTime() > prevStart.getTime()) {
    periodMs = prevEnd.getTime() - prevStart.getTime();
  }

  const extendedFrom = prevEnd && prevEnd.getTime() > now.getTime() ? prevEnd : now;
  const currentPeriodEnd = new Date(extendedFrom.getTime() + periodMs);
  const currentPeriodStart =
    prevEnd && prevEnd.getTime() > now.getTime() && prevStart ? prevStart : now;

  return { currentPeriodStart, currentPeriodEnd, extendedFrom };
}

/**
 * Admin assign/update of a restaurant package: applies the plan immediately and
 * always extends the billing period by one cycle from max(now, currentPeriodEnd).
 */
export async function adminAssignRestaurantPackage(input: {
  restaurantId: string;
  plan: string;
  actorId: string;
}): Promise<SubscriptionDocument> {
  const planDef = await getEffectivePlan(input.plan);
  if (!planDef) throw new Error(`Invalid plan: ${input.plan}`);

  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');

  const existing = await Subscription.findOne({ restaurantId: input.restaurantId });

  if (!existing) {
    const created = await createRestaurantSubscription({
      restaurantId: input.restaurantId,
      plan: input.plan,
      customerEmail: undefined,
      customerName: restaurant.name,
      actorId: input.actorId,
    });

    await logAudit({
      actorId: input.actorId,
      action: 'adminAssignRestaurantPackage',
      resource: 'Subscription',
      resourceId: created._id.toString(),
      details: {
        restaurantId: input.restaurantId,
        plan: planDef.key,
        created: true,
        currentPeriodEnd: created.currentPeriodEnd?.toISOString() ?? null,
        trialEndsAt: created.trialEndsAt?.toISOString() ?? null,
      },
    });

    return created;
  }

  const sub = existing;
  const planChanged = sub.plan !== planDef.key;
  if (planChanged) {
    if (sub.stripeSubscriptionId) {
      await updateStripeSubscription(sub.stripeSubscriptionId, planDef.monthlyPriceCents, {
        prorationBehavior: 'none',
        collectPayment: false,
      });
    }
    sub.plan = planDef.key;
    sub.monthlyPriceCents = planDef.monthlyPriceCents;
    sub.networkCoverFeeCents = planDef.networkCoverFeeCents;
    sub.websiteCoverFeeCents = planDef.websiteCoverFeeCents;
    const premiumSmsAddon = Boolean(
      (sub.features as { premiumSmsAddon?: boolean } | undefined)?.premiumSmsAddon,
    );
    sub.features = { ...planDef.features, premiumSmsAddon };
  }

  sub.pendingPlan = null;
  sub.pendingPlanEffectiveAt = null;
  sub.amountDueCents = 0;
  if (sub.status === 'cancelled' || sub.status === 'past_due' || sub.status === 'paused') {
    sub.status = 'active';
    sub.cancelledAt = undefined;
  }

  const now = new Date();
  const extended = computeExtendedBillingPeriod({
    now,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
  });
  sub.currentPeriodStart = extended.currentPeriodStart;
  sub.currentPeriodEnd = extended.currentPeriodEnd;

  if (sub.status === 'trialing' || (sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime())) {
    const trialBase =
      sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime() ? sub.trialEndsAt : now;
    sub.trialEndsAt = new Date(Math.max(trialBase.getTime(), extended.currentPeriodEnd.getTime()));
  }

  await sub.save();

  await logAudit({
    actorId: input.actorId,
    action: 'adminAssignRestaurantPackage',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: {
      restaurantId: input.restaurantId,
      plan: planDef.key,
      created: false,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    },
  });

  return sub;
}
