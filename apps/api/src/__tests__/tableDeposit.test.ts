import { describe, it, expect } from 'vitest';
import {
  resolveDepositPerGuestCents,
  resolveTableDepositCents,
  resolveCancellationPeriodHours,
  dinerCancelChargePreview,
  dinerCancelChargeWarning,
  isLateCancellation,
} from '@reservations/shared';

const restaurantOn = { depositRequired: true, depositAmountCents: 2500 };
const restaurantOff = { depositRequired: false, depositAmountCents: 2500 };

describe('resolveDepositPerGuestCents', () => {
  it('uses the restaurant default when the table has no override', () => {
    expect(resolveDepositPerGuestCents({ restaurant: restaurantOn })).toBe(2500);
    expect(
      resolveDepositPerGuestCents({
        restaurant: restaurantOn,
        table: { depositRequired: false, depositAmountCents: 9900 },
      }),
    ).toBe(2500);
  });

  it('is zero when neither restaurant nor table require a deposit', () => {
    expect(resolveDepositPerGuestCents({ restaurant: restaurantOff, table: null })).toBe(0);
    expect(
      resolveDepositPerGuestCents({ restaurant: { depositRequired: true, depositAmountCents: 0 } }),
    ).toBe(0);
  });

  it('lets a table override the restaurant amount', () => {
    expect(
      resolveDepositPerGuestCents({
        restaurant: restaurantOn,
        table: { depositRequired: true, depositAmountCents: 5000 },
      }),
    ).toBe(5000);
  });

  it('charges a table deposit even when the restaurant default is off', () => {
    expect(
      resolveDepositPerGuestCents({
        restaurant: restaurantOff,
        table: { depositRequired: true, depositAmountCents: 1500 },
      }),
    ).toBe(1500);
  });

  it('falls back to the restaurant when the table toggle is on without a price', () => {
    expect(
      resolveDepositPerGuestCents({
        restaurant: restaurantOn,
        table: { depositRequired: true, depositAmountCents: 0 },
      }),
    ).toBe(2500);
  });
});

describe('resolveTableDepositCents', () => {
  it('multiplies the per-guest amount by party size', () => {
    expect(
      resolveTableDepositCents({
        restaurant: restaurantOff,
        table: { depositRequired: true, depositAmountCents: 1500 },
        partySize: 4,
      }),
    ).toBe(6000);
  });
});

describe('resolveCancellationPeriodHours', () => {
  it('defaults to 24 when nothing is set', () => {
    expect(resolveCancellationPeriodHours([])).toBe(24);
    expect(resolveCancellationPeriodHours([null, undefined])).toBe(24);
  });

  it('uses the most specific override first', () => {
    expect(resolveCancellationPeriodHours([48, 12, 24])).toBe(48);
    expect(resolveCancellationPeriodHours([null, 12, 24])).toBe(12);
    expect(resolveCancellationPeriodHours([null, null, 36])).toBe(36);
  });
});

describe('dinerCancelChargePreview', () => {
  const start = new Date(Date.now() + 2 * 3_600_000);

  it('charges the card-guarantee fee on a late diner cancel', () => {
    expect(
      dinerCancelChargePreview({
        status: 'confirmed',
        slotStart: start,
        noShowFeeCents: 5000,
        cardGuaranteeStatus: 'card_saved',
      }),
    ).toEqual({ late: true, noShowFeeCents: 5000, prepaidForfeitCents: 0 });
  });

  it('respects a longer cancellation period', () => {
    const in30h = new Date(Date.now() + 30 * 3_600_000);
    expect(isLateCancellation(in30h, new Date(), 48)).toBe(true);
    expect(
      dinerCancelChargePreview({
        status: 'confirmed',
        slotStart: in30h,
        noShowFeeCents: 5000,
        cardGuaranteeStatus: 'card_saved',
        cancellationPeriodHours: 48,
      }),
    ).toEqual({ late: true, noShowFeeCents: 5000, prepaidForfeitCents: 0 });
    expect(
      dinerCancelChargePreview({
        status: 'confirmed',
        slotStart: in30h,
        noShowFeeCents: 5000,
        cardGuaranteeStatus: 'card_saved',
        cancellationPeriodHours: 24,
      }),
    ).toEqual({ late: false, noShowFeeCents: 0, prepaidForfeitCents: 0 });
  });

  it('does not charge when the booking is still outside the window', () => {
    const later = new Date(Date.now() + 48 * 3_600_000);
    expect(
      dinerCancelChargePreview({
        status: 'confirmed',
        slotStart: later,
        noShowFeeCents: 5000,
        cardGuaranteeStatus: 'card_saved',
      }),
    ).toEqual({ late: false, noShowFeeCents: 0, prepaidForfeitCents: 0 });
  });

  it('forfeits a prepaid deposit on a late cancel', () => {
    const preview = dinerCancelChargePreview({
      status: 'confirmed',
      slotStart: start,
      depositAmountCents: 2500,
      depositStatus: 'captured',
    });
    expect(preview.prepaidForfeitCents).toBe(2500);
    expect(dinerCancelChargeWarning({
      status: 'confirmed',
      slotStart: start,
      depositAmountCents: 2500,
      depositStatus: 'captured',
    })).toMatch(/\$25\.00 deposit will not be refunded/);
  });
});
