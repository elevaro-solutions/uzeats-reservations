import { addPlanDuration } from '@reservations/shared';
import { Subscription, type SubscriptionDocument } from '../models/Subscription.js';
import { Restaurant } from '../models/Restaurant.js';
import { logAudit } from './audit.js';
import { cancelStripeSubscription, updateStripePaidPeriodStart } from './stripe.js';
import { getEffectivePlan } from './platformConfig.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export function addOneCalendarMonth(from: Date): Date {
  return addPlanDuration(from, 'month', 1);
}

export type PaidPeriodComputation = {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date;
  status: string;
  paidPeriodHasStarted: boolean;
};

/**
 * Superadmin paid-period start:
 * - Future date → stay/return to trial until that day (first charge).
 * - Today or past → that date is the current paid cycle start; end is +1 calendar month.
 */
export function computePaidPeriodFromStart(input: {
  paidPeriodStart: Date;
  now?: Date;
  currentPeriodStart?: Date | null;
  status: string;
  durationUnit?: string | null;
  durationCount?: number | null;
}): PaidPeriodComputation {
  const now = input.now ?? new Date();
  const start = input.paidPeriodStart;
  const paidPeriodHasStarted = start.getTime() <= now.getTime();

  if (!paidPeriodHasStarted) {
    return {
      currentPeriodStart: input.currentPeriodStart ?? now,
      currentPeriodEnd: start,
      trialEndsAt: start,
      status: 'trialing',
      paidPeriodHasStarted: false,
    };
  }

  const status = input.status === 'trialing' ? 'active' : input.status;
  return {
    currentPeriodStart: start,
    currentPeriodEnd: addPlanDuration(start, input.durationUnit, input.durationCount),
    trialEndsAt: start,
    status,
    paidPeriodHasStarted: true,
  };
}

export async function adminSetSubscriptionPaidPeriodStart(input: {
  restaurantId: string;
  paidPeriodStart: Date;
  actorId: string;
  now?: Date;
}): Promise<SubscriptionDocument> {
  if (
    !(input.paidPeriodStart instanceof Date) ||
    Number.isNaN(input.paidPeriodStart.getTime())
  ) {
    throw new ValidationError('Paid period start must be a valid date');
  }

  const restaurant = await Restaurant.findById(input.restaurantId);
  if (!restaurant) throw new NotFoundError('Restaurant');

  const sub = await Subscription.findOne({ restaurantId: input.restaurantId });
  if (!sub) {
    throw new ValidationError('Assign a package before setting the paid period start');
  }
  if (sub.status === 'cancelled' || sub.status === 'paused') {
    throw new ValidationError(
      'Assign a package to reactivate this restaurant before changing the paid period start',
    );
  }

  const now = input.now ?? new Date();
  const previous = {
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
  };
  const planDef = await getEffectivePlan(sub.plan);
  const next = computePaidPeriodFromStart({
    paidPeriodStart: input.paidPeriodStart,
    now,
    currentPeriodStart: sub.currentPeriodStart,
    status: sub.status,
    durationUnit: planDef?.durationUnit,
    durationCount: planDef?.durationCount,
  });

  const wasTrialing = sub.status === 'trialing';
  let replacedStripeSubscriptionId: string | undefined;
  if (sub.stripeSubscriptionId) {
    const stripeResult = await updateStripePaidPeriodStart(
      sub.stripeSubscriptionId,
      input.paidPeriodStart,
      {
        now,
        currentlyTrialing: wasTrialing,
      },
    );
    if (stripeResult?.previousSubscriptionId && stripeResult.id !== sub.stripeSubscriptionId) {
      replacedStripeSubscriptionId = stripeResult.previousSubscriptionId;
      sub.stripeSubscriptionId = stripeResult.id;
      // Persist the new id before canceling so a Stripe `deleted` webhook cannot
      // match the old id and mark this restaurant cancelled.
      await sub.save();
    }
  }

  sub.currentPeriodStart = next.currentPeriodStart;
  sub.currentPeriodEnd = next.currentPeriodEnd;
  sub.trialEndsAt = next.trialEndsAt;
  sub.status = next.status as SubscriptionDocument['status'];
  if (
    sub.pendingPlan &&
    sub.pendingPlanEffectiveAt &&
    previous.currentPeriodEnd &&
    sub.pendingPlanEffectiveAt.toISOString() === previous.currentPeriodEnd
  ) {
    sub.pendingPlanEffectiveAt = next.currentPeriodEnd;
  }

  await sub.save();

  if (replacedStripeSubscriptionId) {
    await cancelStripeSubscription(replacedStripeSubscriptionId);
  }

  await logAudit({
    actorId: input.actorId,
    action: 'adminSetSubscriptionPaidPeriodStart',
    resource: 'Subscription',
    resourceId: sub._id.toString(),
    details: {
      restaurantId: input.restaurantId,
      paidPeriodStart: input.paidPeriodStart.toISOString(),
      previous,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      status: sub.status,
    },
  });

  return sub;
}
