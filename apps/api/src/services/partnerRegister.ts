import type { RegisterRestaurantPartnerInput, UserRole } from '@reservations/shared';
import { Restaurant } from '../models/Restaurant.js';
import { User } from '../models/User.js';
import { logAudit } from './audit.js';
import { hashPassword, issueTokens } from './auth.js';
import { getEffectivePlan, getPlatformConfig } from './platformConfig.js';
import { createRestaurantSubscription } from './restaurantSubscription.js';
import { provisionDefaultRestaurantSetup } from './restaurantSetup.js';

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

  await provisionDefaultRestaurantSetup(restaurant._id);

  const subscription = await createRestaurantSubscription({
    restaurantId: restaurant._id.toString(),
    plan: input.plan,
    customerEmail: user.email ?? undefined,
    customerName: restaurant.name,
    actorId: user._id.toString(),
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
