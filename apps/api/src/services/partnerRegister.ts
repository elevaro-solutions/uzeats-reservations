import type { RegisterRestaurantPartnerInput, UserRole } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { logAudit } from './audit.js';
import { hashPassword, issueTokens } from './auth.js';
import { getEffectivePlan, getPlatformConfig } from './platformConfig.js';
import { createStripeCustomer, createStripeSubscription } from './stripe.js';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function registerRestaurantPartner(input: RegisterRestaurantPartnerInput) {
  const config = await getPlatformConfig();
  if (config.allowPartnerRegistration === false) {
    throw new Error('Partner registration is currently disabled');
  }

  const planDef = await getEffectivePlan(input.plan);
  if (!planDef) throw new Error(`Invalid plan: ${input.plan}`);

  const email = input.account.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(input.account.password);
  const user = await User.create({
    email,
    passwordHash,
    firstName: input.account.firstName,
    lastName: input.account.lastName,
    phone: input.account.phone,
    role: (config.defaultPartnerRole as UserRole) || 'restaurant_owner',
    emailVerified: false,
  });

  const restaurant = await Restaurant.create({
    name: input.restaurant.name,
    description: input.restaurant.description,
    cuisine: input.restaurant.cuisine,
    priceRange: input.restaurant.priceRange,
    address: {
      ...input.restaurant.address,
      country: input.restaurant.address.country ?? 'US',
    },
    location: {
      type: 'Point',
      coordinates: [input.restaurant.location.lng, input.restaurant.location.lat],
    },
    phone: input.restaurant.phone,
    website: input.restaurant.website,
    depositRequired: input.restaurant.depositRequired ?? false,
    depositAmountCents: input.restaurant.depositAmountCents ?? 0,
    photos: input.restaurant.photos ?? [],
    slug: slugify(input.restaurant.name),
    ownerId: user._id,
    status: 'pending',
  });

  await User.findByIdAndUpdate(user._id, {
    $addToSet: { restaurantIds: restaurant._id },
  });

  const customer = await createStripeCustomer({
    email: user.email ?? undefined,
    name: restaurant.name,
    metadata: { restaurantId: restaurant._id.toString() },
  });

  const stripeSub = await createStripeSubscription({
    customerId: customer.id,
    priceAmountCents: planDef.monthlyPriceCents,
    trialDays: planDef.trialDays || undefined,
    metadata: { restaurantId: restaurant._id.toString(), plan: planDef.key },
  });

  const subscription = await Subscription.create({
    restaurantId: restaurant._id,
    plan: planDef.key,
    status: planDef.trialDays ? 'trialing' : 'active',
    stripeCustomerId: customer.id,
    stripeSubscriptionId: stripeSub.id,
    currentPeriodStart: stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : new Date(Date.now() + 30 * 86_400_000),
    trialEndsAt: stripeSub.trial_end
      ? new Date(stripeSub.trial_end * 1000)
      : undefined,
    monthlyPriceCents: planDef.monthlyPriceCents,
    networkCoverFeeCents: planDef.networkCoverFeeCents,
    websiteCoverFeeCents: planDef.websiteCoverFeeCents,
    features: { ...planDef.features },
  });

  await logAudit({
    actorId: user._id.toString(),
    action: 'registerRestaurantPartner',
    resource: 'Restaurant',
    resourceId: restaurant._id.toString(),
    details: { plan: planDef.key },
  });

  const tokens = await issueTokens(user);
  return { user, restaurant, subscription, ...tokens };
}
