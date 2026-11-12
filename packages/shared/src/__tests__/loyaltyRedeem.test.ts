import { describe, expect, it } from 'vitest';
import { fitDepositRedemptions } from '../loyalty.js';

const platform = {
  balance: 1450,
  minRedeemPoints: 500,
  redeemPointsPerDollar: 100,
};

const restaurant = {
  balance: 1500,
  minRedeemPoints: 800,
  redeemPointsPerDollar: 100,
};

describe('fitDepositRedemptions', () => {
  it('keeps a valid restaurant amount when Tablevera points use the rest of the deposit', () => {
    const fit = fitDepositRedemptions(
      1000,
      { ...platform, points: 500 },
      { ...restaurant, points: 800 },
    );
    expect(fit.restaurantError).toBeNull();
    expect(fit.platform).toBeNull();
    expect(fit.platformNote).toMatch(/Not applied/);
    expect(fit.restaurant).toEqual({ pointsToRedeem: 800, discountCents: 800 });
  });

  it('shrinks Tablevera points so both redemptions fit', () => {
    const fit = fitDepositRedemptions(
      2000,
      { ...platform, points: 1500, balance: 2000 },
      { ...restaurant, points: 800 },
    );
    expect(fit.platformError).toBeNull();
    expect(fit.platformNote).toBeNull();
    expect(fit.platform).toEqual({ pointsToRedeem: 1200, discountCents: 1200 });
    expect(fit.restaurant).toEqual({ pointsToRedeem: 800, discountCents: 800 });
  });

  it('still rejects Tablevera points below the minimum', () => {
    const fit = fitDepositRedemptions(
      2000,
      { ...platform, points: 100 },
      { ...restaurant, points: 800 },
    );
    expect(fit.restaurant).toEqual({ pointsToRedeem: 800, discountCents: 800 });
    expect(fit.platform).toBeNull();
    expect(fit.platformError).toMatch(/Minimum redeem/);
    expect(fit.platformNote).toBeNull();
  });

  it('still rejects a restaurant amount the full deposit cannot cover', () => {
    const fit = fitDepositRedemptions(
      500,
      { ...platform, points: 500 },
      { ...restaurant, points: 800 },
    );
    expect(fit.restaurant).toBeNull();
    expect(fit.restaurantError).toMatch(/Deposit is too small/);
    expect(fit.platform).toEqual({ pointsToRedeem: 500, discountCents: 500 });
  });
});
