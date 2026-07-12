import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { PLANS } from './config/plans.js';
import { hashPassword } from './services/auth.js';
import {
  User,
  Restaurant,
  Table,
  Shift,
  Blackout,
  Menu,
  Reservation,
  WaitlistEntry,
  Review,
  LoyaltyTransaction,
  Notification,
  Subscription,
  CoverFee,
} from './models/index.js';

function atOffset(days: number, hours = 19, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dateStr(days: number): string {
  return atOffset(days).toISOString().slice(0, 10);
}

function slot(days: number, hours = 19, turnMinutes = 90) {
  const start = atOffset(days, hours);
  return { slotStart: start, slotEnd: new Date(start.getTime() + turnMinutes * 60_000) };
}

const MENUS: Record<
  string,
  { name: string; items: { name: string; description: string; priceCents: number; dietary: string[] }[] }[]
> = {
  Steakhouse: [
    {
      name: 'Starters',
      items: [
        { name: 'Caesar Salad', description: 'Romaine, anchovy dressing, croutons', priceCents: 1600, dietary: [] },
        { name: 'Oysters Rockefeller', description: 'Half dozen, spinach & Pernod', priceCents: 2400, dietary: [] },
      ],
    },
    {
      name: 'Mains',
      items: [
        { name: 'Dry-Aged Ribeye', description: '16oz, bone marrow butter', priceCents: 7200, dietary: [] },
        { name: 'Filet Mignon', description: '8oz, red wine reduction', priceCents: 6800, dietary: [] },
      ],
    },
  ],
  Italian: [
    {
      name: 'Antipasti',
      items: [
        { name: 'Burrata', description: 'Heirloom tomatoes, basil oil', priceCents: 1800, dietary: ['vegetarian'] },
        { name: 'Carpaccio', description: 'Thin-sliced beef, arugula, lemon', priceCents: 2000, dietary: [] },
      ],
    },
    {
      name: 'Pasta & Pizza',
      items: [
        { name: 'Cacio e Pepe', description: 'Pecorino, black pepper', priceCents: 2400, dietary: ['vegetarian'] },
        { name: 'Margherita Pizza', description: 'San Marzano, mozzarella di bufala', priceCents: 2200, dietary: ['vegetarian'] },
      ],
    },
  ],
  Japanese: [
    {
      name: 'Small Plates',
      items: [
        { name: 'Edamame', description: 'Sea salt', priceCents: 800, dietary: ['vegan', 'vegetarian'] },
        { name: 'Tuna Tataki', description: 'Sesame, ponzu', priceCents: 1800, dietary: [] },
      ],
    },
    {
      name: 'Sushi & Mains',
      items: [
        { name: 'Omakase Set', description: "Chef's selection, 10 pieces", priceCents: 8500, dietary: [] },
        { name: 'Chicken Teriyaki', description: 'Jasmine rice, pickles', priceCents: 2800, dietary: [] },
      ],
    },
  ],
  Mexican: [
    {
      name: 'Botanas',
      items: [
        { name: 'Guacamole', description: 'Tostadas, salsa verde', priceCents: 1200, dietary: ['vegan', 'vegetarian'] },
        { name: 'Elote', description: 'Cotija, chili, lime', priceCents: 900, dietary: ['vegetarian'] },
      ],
    },
    {
      name: 'Platos',
      items: [
        { name: 'Duck Carnitas Tacos', description: 'Three tacos, pickled onion', priceCents: 2200, dietary: [] },
        { name: 'Chile Relleno', description: 'Oaxaca cheese, ranchero sauce', priceCents: 2400, dietary: ['vegetarian'] },
      ],
    },
  ],
  Seafood: [
    {
      name: 'Raw Bar',
      items: [
        { name: 'East Coast Oysters', description: 'Half dozen, mignonette', priceCents: 2200, dietary: [] },
        { name: 'Shrimp Cocktail', description: 'House cocktail sauce', priceCents: 1800, dietary: [] },
      ],
    },
    {
      name: 'Mains',
      items: [
        { name: 'Lobster Roll', description: 'Warm butter, brioche', priceCents: 4200, dietary: [] },
        { name: 'Pan-Roasted Cod', description: 'Clam chowder broth', priceCents: 3600, dietary: [] },
      ],
    },
  ],
  French: [
    {
      name: 'Entrées',
      items: [
        { name: 'French Onion Soup', description: 'Gruyère crouton', priceCents: 1400, dietary: ['vegetarian'] },
        { name: 'Steak Frites', description: 'Hanger steak, herb butter', priceCents: 3800, dietary: [] },
      ],
    },
  ],
  American: [
    {
      name: 'Classics',
      items: [
        { name: 'Wedge Salad', description: 'Blue cheese, bacon', priceCents: 1400, dietary: [] },
        { name: 'Cheeseburger', description: 'Aged cheddar, fries', priceCents: 2200, dietary: [] },
      ],
    },
  ],
};

type RestaurantSeed = {
  name: string;
  cuisine: string;
  priceRange: number;
  city: string;
  state: string;
  zip: string;
  lng: number;
  lat: number;
  description: string;
  depositRequired: boolean;
  depositAmountCents: number;
  status: 'approved' | 'pending' | 'suspended';
  plan?: keyof typeof PLANS;
  rating?: number;
  reviewCount?: number;
};

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Seeding...');

  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    Table.deleteMany({}),
    Shift.deleteMany({}),
    Blackout.deleteMany({}),
    Menu.deleteMany({}),
    Reservation.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    Review.deleteMany({}),
    LoyaltyTransaction.deleteMany({}),
    Notification.deleteMany({}),
    Subscription.deleteMany({}),
    CoverFee.deleteMany({}),
  ]);

  const passwordHash = await hashPassword('Password123!');

  const [admin, owner, staff, diner, diner2] = await User.create([
    {
      email: 'admin@reservations.local',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'admin',
      emailVerified: true,
      loyaltyPoints: 0,
    },
    {
      email: 'owner@reservations.local',
      passwordHash,
      firstName: 'Rita',
      lastName: 'Owner',
      role: 'restaurant_owner',
      emailVerified: true,
      phone: '+15550001001',
      phoneVerified: true,
      loyaltyPoints: 0,
    },
    {
      email: 'staff@reservations.local',
      passwordHash,
      firstName: 'Sam',
      lastName: 'Staff',
      role: 'staff',
      emailVerified: true,
      phone: '+15550001002',
      phoneVerified: true,
      loyaltyPoints: 0,
    },
    {
      email: 'diner@reservations.local',
      passwordHash,
      firstName: 'Dan',
      lastName: 'Diner',
      role: 'diner',
      emailVerified: true,
      phone: '+15551234567',
      phoneVerified: true,
      loyaltyPoints: 750,
    },
    {
      email: 'diner2@reservations.local',
      passwordHash,
      firstName: 'Dana',
      lastName: 'Guest',
      role: 'diner',
      emailVerified: true,
      phone: '+15559876543',
      phoneVerified: true,
      loyaltyPoints: 200,
    },
  ]);

  const restaurantsData: RestaurantSeed[] = [
    {
      name: 'Harbor Steakhouse',
      cuisine: 'Steakhouse',
      priceRange: 4,
      city: 'New York',
      state: 'NY',
      zip: '10013',
      lng: -74.0059,
      lat: 40.7195,
      description: 'Dry-aged steaks and classic cocktails in Tribeca.',
      depositRequired: true,
      depositAmountCents: 2500,
      status: 'approved',
      plan: 'pro',
      rating: 4.7,
      reviewCount: 128,
    },
    {
      name: 'Nonna Bella',
      cuisine: 'Italian',
      priceRange: 3,
      city: 'New York',
      state: 'NY',
      zip: '10012',
      lng: -73.998,
      lat: 40.7255,
      description: 'Handmade pasta and wood-fired pizzas in SoHo.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'core',
      rating: 4.5,
      reviewCount: 96,
    },
    {
      name: 'Sakura Garden',
      cuisine: 'Japanese',
      priceRange: 3,
      city: 'New York',
      state: 'NY',
      zip: '10003',
      lng: -73.9897,
      lat: 40.7312,
      description: 'Omakase and izakaya favorites near Union Square.',
      depositRequired: true,
      depositAmountCents: 1500,
      status: 'approved',
      plan: 'core',
      rating: 4.6,
      reviewCount: 74,
    },
    {
      name: 'Casa Verde',
      cuisine: 'Mexican',
      priceRange: 2,
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      lng: -97.7431,
      lat: 30.2672,
      description: 'Modern Mexican with mezcal flights downtown.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'basic',
      rating: 4.3,
      reviewCount: 51,
    },
    {
      name: 'The Blue Crab',
      cuisine: 'Seafood',
      priceRange: 3,
      city: 'Boston',
      state: 'MA',
      zip: '02110',
      lng: -71.0547,
      lat: 42.3584,
      description: 'Fresh oysters and New England classics on the waterfront.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'pro',
      rating: 4.4,
      reviewCount: 88,
    },
    {
      name: 'Petit Bistro',
      cuisine: 'French',
      priceRange: 3,
      city: 'New York',
      state: 'NY',
      zip: '10014',
      lng: -74.0045,
      lat: 40.7336,
      description: 'Cozy West Village bistro awaiting approval.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'pending',
    },
    {
      name: 'Smokehouse Grill',
      cuisine: 'American',
      priceRange: 2,
      city: 'Austin',
      state: 'TX',
      zip: '78702',
      lng: -97.72,
      lat: 30.26,
      description: 'Temporarily suspended for policy review.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'suspended',
      plan: 'basic',
      rating: 3.8,
      reviewCount: 22,
    },
  ];

  const created: {
    restaurant: mongoose.Document & { _id: mongoose.Types.ObjectId; name: string };
    tables: { _id: mongoose.Types.ObjectId }[];
  }[] = [];

  for (const r of restaurantsData) {
    const restaurant = await Restaurant.create({
      name: r.name,
      slug: r.name.toLowerCase().replace(/\s+/g, '-') + '-demo',
      description: r.description,
      cuisine: r.cuisine,
      priceRange: r.priceRange,
      address: {
        line1: '100 Main St',
        city: r.city,
        state: r.state,
        zip: r.zip,
        country: 'US',
      },
      location: { type: 'Point', coordinates: [r.lng, r.lat] },
      phone: '+15550001111',
      website: `https://example.com/${r.name.toLowerCase().replace(/\s+/g, '-')}`,
      photos: [`https://picsum.photos/seed/${encodeURIComponent(r.name)}/800/600`],
      status: r.status,
      ownerId: owner!._id,
      depositRequired: r.depositRequired,
      depositAmountCents: r.depositAmountCents,
      averageRating: r.rating ?? 0,
      reviewCount: r.reviewCount ?? 0,
    });

    await User.findByIdAndUpdate(owner!._id, {
      $addToSet: { restaurantIds: restaurant._id },
    });

    if (r.name === 'Harbor Steakhouse') {
      await User.findByIdAndUpdate(staff!._id, {
        $addToSet: { restaurantIds: restaurant._id },
      });
    }

    const tables = await Table.insertMany([
      {
        restaurantId: restaurant._id,
        name: 'T1',
        minCapacity: 1,
        maxCapacity: 2,
        floorArea: 'Window',
      },
      {
        restaurantId: restaurant._id,
        name: 'T2',
        minCapacity: 2,
        maxCapacity: 4,
        floorArea: 'Main',
      },
      {
        restaurantId: restaurant._id,
        name: 'T3',
        minCapacity: 2,
        maxCapacity: 4,
        floorArea: 'Main',
      },
      {
        restaurantId: restaurant._id,
        name: 'T4',
        minCapacity: 4,
        maxCapacity: 6,
        floorArea: 'Patio',
      },
      {
        restaurantId: restaurant._id,
        name: 'T5',
        minCapacity: 6,
        maxCapacity: 10,
        floorArea: 'Private',
        combinable: true,
      },
    ]);

    if (r.status === 'approved' || r.status === 'suspended') {
      await Shift.create({
        restaurantId: restaurant._id,
        name: 'Dinner',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startTime: '17:00',
        endTime: '22:00',
        slotIntervalMinutes: 15,
        turnTimeMinutes: 90,
        active: true,
      });

      await Shift.create({
        restaurantId: restaurant._id,
        name: 'Lunch',
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: '11:30',
        endTime: '14:30',
        slotIntervalMinutes: 15,
        turnTimeMinutes: 75,
        active: true,
      });

      const sections = MENUS[r.cuisine] ?? MENUS.American!;
      await Menu.create({
        restaurantId: restaurant._id,
        sections: sections.map((s) => ({
          name: s.name,
          items: s.items.map((item) => ({ ...item, available: true })),
        })),
      });

      if (r.plan) {
        const plan = PLANS[r.plan];
        const periodStart = atOffset(-10, 0, 0);
        const periodEnd = atOffset(20, 0, 0);
        await Subscription.create({
          restaurantId: restaurant._id,
          plan: r.plan,
          status: r.status === 'suspended' ? 'paused' : 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          monthlyPriceCents: plan.monthlyPriceCents,
          networkCoverFeeCents: plan.networkCoverFeeCents,
          websiteCoverFeeCents: plan.websiteCoverFeeCents,
          features: plan.features,
        });
      }
    }

    created.push({ restaurant, tables });
  }

  const harbor = created.find((c) => c.restaurant.name === 'Harbor Steakhouse')!;
  const nonna = created.find((c) => c.restaurant.name === 'Nonna Bella')!;
  const sakura = created.find((c) => c.restaurant.name === 'Sakura Garden')!;
  const casa = created.find((c) => c.restaurant.name === 'Casa Verde')!;
  const crab = created.find((c) => c.restaurant.name === 'The Blue Crab')!;

  await Blackout.insertMany([
    {
      restaurantId: harbor.restaurant._id,
      date: dateStr(14),
      reason: 'Private buyout',
      allDay: true,
    },
    {
      restaurantId: nonna.restaurant._id,
      date: dateStr(7),
      reason: 'Kitchen renovation (lunch only)',
      allDay: false,
      startTime: '11:30',
      endTime: '14:30',
    },
    {
      restaurantId: sakura.restaurant._id,
      date: dateStr(21),
      reason: 'New Year staff party',
      allDay: true,
    },
  ]);

  const completedHarbor = await Reservation.create({
    restaurantId: harbor.restaurant._id,
    dinerId: diner!._id,
    tableIds: [harbor.tables[1]!._id],
    partySize: 2,
    ...slot(-14, 19),
    status: 'completed',
    occasion: 'anniversary',
    guestNotes: 'Celebrated our anniversary',
    depositAmountCents: 5000,
    depositStatus: 'captured',
    loyaltyPointsEarned: 100,
    source: 'network',
  });

  const completedNonna = await Reservation.create({
    restaurantId: nonna.restaurant._id,
    dinerId: diner!._id,
    tableIds: [nonna.tables[2]!._id],
    partySize: 4,
    ...slot(-7, 20),
    status: 'completed',
    occasion: 'birthday',
    guestNotes: 'Birthday dessert please',
    depositAmountCents: 0,
    depositStatus: 'none',
    loyaltyPointsEarned: 100,
    source: 'website',
  });

  const completedSakura = await Reservation.create({
    restaurantId: sakura.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [sakura.tables[0]!._id],
    partySize: 2,
    ...slot(-3, 18, 30),
    status: 'completed',
    occasion: 'date',
    depositAmountCents: 3000,
    depositStatus: 'captured',
    loyaltyPointsEarned: 100,
    source: 'network',
  });

  await Reservation.create({
    restaurantId: harbor.restaurant._id,
    dinerId: diner!._id,
    tableIds: [harbor.tables[1]!._id],
    partySize: 2,
    ...slot(1, 19),
    status: 'confirmed',
    occasion: 'anniversary',
    guestNotes: 'Window seat if possible',
    depositAmountCents: 5000,
    depositStatus: 'authorized',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: nonna.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [nonna.tables[3]!._id],
    partySize: 5,
    ...slot(2, 18, 30),
    status: 'confirmed',
    occasion: 'business',
    guestNotes: 'Quiet table preferred',
    depositAmountCents: 0,
    depositStatus: 'none',
    source: 'widget',
  });

  await Reservation.create({
    restaurantId: casa.restaurant._id,
    dinerId: diner!._id,
    tableIds: [casa.tables[1]!._id],
    partySize: 3,
    ...slot(0, 18),
    status: 'pending',
    occasion: 'none',
    depositAmountCents: 0,
    depositStatus: 'none',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: crab.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [crab.tables[4]!._id],
    partySize: 8,
    ...slot(0, 19),
    status: 'seated',
    occasion: 'celebration',
    guestNotes: 'Large party — already seated',
    depositAmountCents: 0,
    depositStatus: 'none',
    source: 'phone',
  });

  await Reservation.create({
    restaurantId: sakura.restaurant._id,
    dinerId: diner!._id,
    tableIds: [sakura.tables[2]!._id],
    partySize: 2,
    ...slot(-2, 19),
    status: 'cancelled',
    occasion: 'none',
    depositAmountCents: 3000,
    depositStatus: 'refunded',
    cancelledAt: atOffset(-2, 10),
    cancellationReason: 'Change of plans',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: harbor.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [harbor.tables[0]!._id],
    partySize: 2,
    ...slot(-5, 20),
    status: 'no_show',
    occasion: 'date',
    depositAmountCents: 5000,
    depositStatus: 'captured',
    source: 'network',
  });

  // Same-evening inventory pressure at Harbor (multiple tables booked)
  await Reservation.create({
    restaurantId: harbor.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [harbor.tables[3]!._id],
    partySize: 4,
    ...slot(1, 19),
    status: 'confirmed',
    occasion: 'business',
    depositAmountCents: 10000,
    depositStatus: 'authorized',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: harbor.restaurant._id,
    dinerId: diner!._id,
    tableIds: [harbor.tables[4]!._id],
    partySize: 8,
    ...slot(1, 19, 30),
    status: 'confirmed',
    occasion: 'celebration',
    guestNotes: 'Private dining',
    depositAmountCents: 20000,
    depositStatus: 'authorized',
    source: 'website',
  });

  await Review.insertMany([
    {
      restaurantId: harbor.restaurant._id,
      dinerId: diner!._id,
      reservationId: completedHarbor._id,
      rating: 5,
      comment: 'Perfect anniversary dinner — steaks were exceptional.',
    },
    {
      restaurantId: nonna.restaurant._id,
      dinerId: diner!._id,
      reservationId: completedNonna._id,
      rating: 4,
      comment: 'Great pasta and friendly staff. A bit noisy on weekends.',
    },
    {
      restaurantId: sakura.restaurant._id,
      dinerId: diner2!._id,
      reservationId: completedSakura._id,
      rating: 5,
      comment: 'Best omakase in the neighborhood.',
    },
  ]);

  await WaitlistEntry.insertMany([
    {
      restaurantId: harbor.restaurant._id,
      dinerId: diner2!._id,
      partySize: 2,
      preferredDate: dateStr(1),
      preferredTimeStart: '19:00',
      preferredTimeEnd: '21:00',
      status: 'waiting',
    },
    {
      restaurantId: sakura.restaurant._id,
      dinerId: diner!._id,
      partySize: 4,
      preferredDate: dateStr(3),
      preferredTimeStart: '18:00',
      preferredTimeEnd: '20:00',
      status: 'notified',
      notifiedAt: atOffset(0, 9),
      notifiedSlot: atOffset(3, 18, 30),
    },
    {
      restaurantId: nonna.restaurant._id,
      dinerId: diner2!._id,
      partySize: 2,
      preferredDate: dateStr(-1),
      preferredTimeStart: '19:00',
      preferredTimeEnd: '21:00',
      status: 'expired',
    },
    {
      restaurantId: casa.restaurant._id,
      dinerId: diner!._id,
      partySize: 6,
      preferredDate: dateStr(5),
      preferredTimeStart: '18:00',
      preferredTimeEnd: '20:00',
      status: 'cancelled',
    },
  ]);

  await LoyaltyTransaction.insertMany([
    {
      userId: diner!._id,
      reservationId: completedHarbor._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Harbor Steakhouse',
    },
    {
      userId: diner!._id,
      reservationId: completedNonna._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Nonna Bella',
    },
    {
      userId: diner!._id,
      type: 'earn',
      points: 50,
      description: 'Deposit points from Harbor Steakhouse',
    },
    {
      userId: diner!._id,
      type: 'redeem',
      points: -500,
      description: 'Redeemed for $5 off next booking',
    },
    {
      userId: diner!._id,
      type: 'adjust',
      points: 1000,
      description: 'Welcome bonus',
    },
    {
      userId: diner2!._id,
      reservationId: completedSakura._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Sakura Garden',
    },
    {
      userId: diner2!._id,
      type: 'earn',
      points: 100,
      description: 'Welcome bonus',
    },
  ]);

  await Notification.insertMany([
    {
      userId: diner!._id,
      channel: 'email',
      type: 'reservation_confirmed',
      title: 'Reservation confirmed',
      body: 'Your table at Harbor Steakhouse tomorrow at 7:00 PM is confirmed.',
      status: 'sent',
      sentAt: atOffset(0, 8),
      data: { restaurantName: 'Harbor Steakhouse' },
    },
    {
      userId: diner!._id,
      channel: 'push',
      type: 'reminder',
      title: 'Reminder: dinner tomorrow',
      body: 'Harbor Steakhouse — party of 2 at 7:00 PM.',
      status: 'queued',
    },
    {
      userId: diner2!._id,
      channel: 'email',
      type: 'waitlist_notified',
      title: 'A table opened up',
      body: 'Sakura Garden has a table for 4 on your preferred date.',
      status: 'sent',
      sentAt: atOffset(0, 9),
    },
    {
      userId: owner!._id,
      channel: 'email',
      type: 'new_reservation',
      title: 'New reservation',
      body: 'Dan Diner booked a party of 2 at Harbor Steakhouse.',
      status: 'sent',
      sentAt: atOffset(0, 8),
    },
  ]);

  const period = atOffset(0).toISOString().slice(0, 7);
  await CoverFee.insertMany([
    {
      restaurantId: harbor.restaurant._id,
      reservationId: completedHarbor._id,
      dinerId: diner!._id,
      partySize: 2,
      source: 'network',
      feeCents: PLANS.pro.networkCoverFeeCents * 2,
      status: 'charged',
      billingPeriod: period,
    },
    {
      restaurantId: nonna.restaurant._id,
      reservationId: completedNonna._id,
      dinerId: diner!._id,
      partySize: 4,
      source: 'website',
      feeCents: 0,
      status: 'waived',
      billingPeriod: period,
    },
    {
      restaurantId: sakura.restaurant._id,
      reservationId: completedSakura._id,
      dinerId: diner2!._id,
      partySize: 2,
      source: 'network',
      feeCents: PLANS.core.networkCoverFeeCents * 2,
      status: 'charged',
      billingPeriod: period,
    },
  ]);

  console.log('Seed complete!');
  console.log('');
  console.log('Accounts (password: Password123!):');
  console.log('  admin@reservations.local   — platform admin');
  console.log('  owner@reservations.local   — restaurant owner (all venues)');
  console.log('  staff@reservations.local   — staff at Harbor Steakhouse');
  console.log('  diner@reservations.local   — diner (750 pts)');
  console.log('  diner2@reservations.local  — second diner (200 pts)');
  console.log('');
  console.log('Data summary:');
  console.log(`  ${restaurantsData.length} restaurants (5 approved, 1 pending, 1 suspended)`);
  console.log('  Reservations across statuses: pending, confirmed, seated, completed, cancelled, no_show');
  console.log('  Reviews, waitlist entries, blackouts, loyalty, notifications, subscriptions, cover fees');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
