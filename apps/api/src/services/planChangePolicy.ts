import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey, type PlanFeatures } from '../config/plans.js';

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same';

export type PlanChangeSubscriptionState = {
  plan: string;
  status: string;
  monthlyPriceCents: number;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  features?: Partial<PlanFeatures> | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  pendingPlan?: string | null;
  lastPaidPlanChangeAt?: Date | null;
};

export type PlanSnapshot = {
  key: string;
  name: string;
  monthlyPriceCents: number;
  networkCoverFeeCents: number;
  websiteCoverFeeCents: number;
  features: PlanFeatures;
};

export type PlanChangeDecision = {
  fromPlan: string;
  toPlan: string;
  direction: PlanChangeDirection;
  allowed: boolean;
  blockedReason: string | null;
  immediate: boolean;
  effectiveAt: Date | null;
  proratedChargeCents: number;
  featuresLost: string[];
  featuresGained: string[];
  currentMonthlyPriceCents: number;
  nextMonthlyPriceCents: number;
  currentNetworkCoverFeeCents: number;
  nextNetworkCoverFeeCents: number;
  currentWebsiteCoverFeeCents: number;
  nextWebsiteCoverFeeCents: number;
};

export function planDirection(fromPriceCents: number, toPriceCents: number): PlanChangeDirection {
  if (toPriceCents > fromPriceCents) return 'upgrade';
  if (toPriceCents < fromPriceCents) return 'downgrade';
  return 'same';
}

export function featureDiff(from: PlanFeatures, to: PlanFeatures): { lost: string[]; gained: string[] } {
  const lost: string[] = [];
  const gained: string[] = [];
  for (const key of FEATURE_KEYS) {
    if (from[key] && !to[key]) lost.push(FEATURE_LABELS[key as FeatureKey]);
    if (!from[key] && to[key]) gained.push(FEATURE_LABELS[key as FeatureKey]);
  }
  return { lost, gained };
}

/** Amount due today when switching immediately: the new plan's full monthly price. */
export function immediatePlanChangeChargeCents(toPriceCents: number): number {
  return Math.max(0, toPriceCents);
}

export function evaluatePlanChange(input: {
  subscription: PlanChangeSubscriptionState;
  fromPlan: PlanSnapshot;
  toPlan: PlanSnapshot;
  now?: Date;
  /**
   * Start now and charge the new plan's full monthly price.
   * Omit to default: upgrades now, downgrades at period end.
   */
  forceImmediate?: boolean;
}): PlanChangeDecision {
  const now = input.now ?? new Date();
  const sub = input.subscription;
  const direction = planDirection(input.fromPlan.monthlyPriceCents, input.toPlan.monthlyPriceCents);
  const diff = featureDiff(input.fromPlan.features, input.toPlan.features);
  // Omit forceImmediate → upgrades start now, downgrades wait for period end.
  const immediate = input.forceImmediate ?? direction === 'upgrade';
  const base: PlanChangeDecision = {
    fromPlan: input.fromPlan.key,
    toPlan: input.toPlan.key,
    direction,
    allowed: false,
    blockedReason: null,
    immediate,
    effectiveAt: immediate ? now : (sub.currentPeriodEnd ?? null),
    proratedChargeCents: immediate
      ? immediatePlanChangeChargeCents(input.toPlan.monthlyPriceCents)
      : 0,
    featuresLost: diff.lost,
    featuresGained: diff.gained,
    currentMonthlyPriceCents: input.fromPlan.monthlyPriceCents,
    nextMonthlyPriceCents: input.toPlan.monthlyPriceCents,
    currentNetworkCoverFeeCents: sub.networkCoverFeeCents,
    nextNetworkCoverFeeCents: input.toPlan.networkCoverFeeCents,
    currentWebsiteCoverFeeCents: sub.websiteCoverFeeCents,
    nextWebsiteCoverFeeCents: input.toPlan.websiteCoverFeeCents,
  };

  if (sub.status === 'cancelled') {
    return { ...base, blockedReason: 'Cannot change a cancelled subscription.' };
  }
  if (sub.status === 'past_due' || sub.status === 'paused') {
    return {
      ...base,
      blockedReason: 'Resolve the outstanding payment before changing plans.',
    };
  }

  if (direction === 'same') {
    if (sub.pendingPlan && sub.pendingPlan !== sub.plan) {
      return {
        ...base,
        allowed: true,
        blockedReason: null,
        immediate: false,
        effectiveAt: now,
        featuresLost: [],
        featuresGained: [],
      };
    }
    return { ...base, blockedReason: 'You are already on this plan.' };
  }

  const trialActive =
    sub.status === 'trialing' || Boolean(sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime());
  if (direction === 'downgrade' && trialActive) {
    return {
      ...base,
      blockedReason: 'Downgrades are available after the trial ends. You can upgrade anytime.',
    };
  }

  if (direction === 'upgrade' && sub.currentPeriodStart && sub.lastPaidPlanChangeAt) {
    const changedThisPeriod = sub.lastPaidPlanChangeAt.getTime() >= sub.currentPeriodStart.getTime();
    if (changedThisPeriod) {
      const nextAt = sub.currentPeriodEnd
        ? sub.currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'the next billing date';
      return {
        ...base,
        blockedReason: `You can make one paid upgrade per billing period. Next upgrade is available after ${nextAt}.`,
      };
    }
  }

  return { ...base, allowed: true };
}
