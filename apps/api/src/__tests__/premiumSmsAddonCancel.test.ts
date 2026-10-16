import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { getFeatures, hasPremiumSms } from '../services/plans.js';
import { getPlatformConfig } from '../services/platformConfig.js';
import { PlatformConfig } from '../models/PlatformConfig.js';

async function seedCoreSub(
  status: 'active' | 'cancelled' | 'paused',
  opts?: { balance?: number; premiumSms?: boolean },
) {
  const owner = await User.create({
    email: `sms-owner-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'unused',
    firstName: 'Sms',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  const restaurant = await Restaurant.create({
    name: 'SMS Kitchen',
    slug: `sms-kit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cuisine: 'American',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test St', city: 'Testville', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
  const sub = await Subscription.create({
    restaurantId: restaurant._id,
    plan: opts?.premiumSms ? 'pro' : 'core',
    status,
    monthlyPriceCents: opts?.premiumSms ? 19900 : 9900,
    networkCoverFeeCents: 0,
    websiteCoverFeeCents: 0,
    features: {
      premiumSms: Boolean(opts?.premiumSms),
      premiumSmsAddon: true,
    },
    addons: {
      smsCredits: { balance: opts?.balance ?? 0 },
    },
  });
  return { restaurant, sub };
}

describe('Premium SMS after cancellation', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    await getPlatformConfig();
    await PlatformConfig.updateOne({ key: 'default' }, { $set: { 'featureFlags.sms': true } });
  });

  it('does not grant SMS sending when subscription is cancelled even with credits', async () => {
    const { restaurant } = await seedCoreSub('cancelled', { balance: 50 });
    const features = await getFeatures(restaurant._id.toString());
    expect(features.premiumSms).toBeFalsy();
    expect(features.premiumSmsAddon).toBeFalsy();
    expect(await hasPremiumSms(restaurant._id.toString())).toBe(false);
  });

  it('does not grant SMS from legacy addon flag alone (prepaid credits required)', async () => {
    const { restaurant } = await seedCoreSub('active', { balance: 0 });
    expect(await hasPremiumSms(restaurant._id.toString())).toBe(false);
  });

  it('grants SMS when prepaid credit balance is available on active Core', async () => {
    const { restaurant } = await seedCoreSub('active', { balance: 10 });
    expect(await hasPremiumSms(restaurant._id.toString())).toBe(true);
  });

  it('grants SMS when Pro includes premiumSms without credits', async () => {
    const { restaurant } = await seedCoreSub('active', { balance: 0, premiumSms: true });
    // Stored features.premiumSms is true, but getFeatures merges plan features —
    // Pro plan definition includes premiumSms.
    expect(await hasPremiumSms(restaurant._id.toString())).toBe(true);
  });
});
