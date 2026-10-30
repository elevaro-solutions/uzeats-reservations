import { describe, expect, it } from 'vitest';
import {
  stripeSubscriptionIsTrialing,
  stripeTrialEndAfterAnchor,
} from '../services/stripe.js';

describe('stripeSubscriptionIsTrialing', () => {
  const nowSec = 1_793_276_066;

  it('is true when Stripe status is trialing', () => {
    expect(stripeSubscriptionIsTrialing({ status: 'trialing', trial_end: nowSec - 1 }, nowSec)).toBe(
      true,
    );
  });

  it('is true when trial_end is still in the future', () => {
    expect(
      stripeSubscriptionIsTrialing({ status: 'active', trial_end: nowSec + 2_591_937 }, nowSec),
    ).toBe(true);
  });

  it('is false when the trial has already ended', () => {
    expect(stripeSubscriptionIsTrialing({ status: 'active', trial_end: nowSec - 1 }, nowSec)).toBe(
      false,
    );
    expect(stripeSubscriptionIsTrialing({ status: 'active', trial_end: null }, nowSec)).toBe(false);
  });
});

describe('stripeTrialEndAfterAnchor', () => {
  it('detects Stripe’s trial_end vs billing_cycle_anchor rejection', () => {
    expect(stripeTrialEndAfterAnchor(1_795_868_003, 1_793_276_066)).toBe(true);
    expect(stripeTrialEndAfterAnchor(1_793_276_066, 1_793_276_066)).toBe(false);
    expect(stripeTrialEndAfterAnchor(1_793_276_066, 1_795_868_003)).toBe(false);
    expect(stripeTrialEndAfterAnchor(1_795_868_003, null)).toBe(false);
  });
});
