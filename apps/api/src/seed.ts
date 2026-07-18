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
  Uzbek: [
    {
      name: 'Starters',
      items: [
        { name: 'Somsa', description: 'Flaky pastry with lamb and onions', priceCents: 800, dietary: [] },
        { name: 'Achichuk', description: 'Tomato, onion, and chili salad', priceCents: 700, dietary: ['vegan', 'vegetarian'] },
      ],
    },
    {
      name: 'Mains',
      items: [
        { name: 'Plov', description: 'Samarkand-style rice with lamb and carrots', priceCents: 2200, dietary: [] },
        { name: 'Lagman', description: 'Hand-pulled noodles in rich meat broth', priceCents: 1800, dietary: [] },
        { name: 'Shashlik', description: 'Charcoal-grilled lamb skewers', priceCents: 2400, dietary: [] },
        { name: 'Manti', description: 'Steamed dumplings with beef and onion', priceCents: 1600, dietary: [] },
      ],
    },
    {
      name: 'Drinks & Sweets',
      items: [
        { name: 'Green Tea', description: 'Traditional pot of kok choy', priceCents: 400, dietary: ['vegan', 'vegetarian'] },
        { name: 'Navat Halva', description: 'House-made sesame sweet', priceCents: 600, dietary: ['vegetarian'] },
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

const CITIES: { city: string; state: string; zip: string; lng: number; lat: number }[] = [
  // New York
  { city: 'New York', state: 'NY', zip: '10001', lng: -73.9942, lat: 40.7505 },
  { city: 'Brooklyn', state: 'NY', zip: '11201', lng: -73.9903, lat: 40.6943 },
  { city: 'Queens', state: 'NY', zip: '11354', lng: -73.8272, lat: 40.759 },
  { city: 'Buffalo', state: 'NY', zip: '14202', lng: -78.8784, lat: 42.8864 },
  { city: 'Rochester', state: 'NY', zip: '14604', lng: -77.6109, lat: 43.1566 },
  { city: 'Albany', state: 'NY', zip: '12207', lng: -73.7562, lat: 42.6526 },
  // New Jersey
  { city: 'Jersey City', state: 'NJ', zip: '07302', lng: -74.0431, lat: 40.7178 },
  { city: 'Newark', state: 'NJ', zip: '07102', lng: -74.1724, lat: 40.7357 },
  { city: 'Paterson', state: 'NJ', zip: '07501', lng: -74.1718, lat: 40.9168 },
  { city: 'Edison', state: 'NJ', zip: '08817', lng: -74.4121, lat: 40.5187 },
  { city: 'Hoboken', state: 'NJ', zip: '07030', lng: -74.0324, lat: 40.744 },
  { city: 'Princeton', state: 'NJ', zip: '08540', lng: -74.6672, lat: 40.3573 },
  { city: 'Atlantic City', state: 'NJ', zip: '08401', lng: -74.4229, lat: 39.3643 },
  // Florida
  { city: 'Miami', state: 'FL', zip: '33131', lng: -80.1918, lat: 25.7617 },
  { city: 'Orlando', state: 'FL', zip: '32801', lng: -81.3792, lat: 28.5383 },
  { city: 'Tampa', state: 'FL', zip: '33602', lng: -82.4572, lat: 27.9506 },
  { city: 'Jacksonville', state: 'FL', zip: '32202', lng: -81.6557, lat: 30.3322 },
  { city: 'Fort Lauderdale', state: 'FL', zip: '33301', lng: -80.1373, lat: 26.1224 },
  { city: 'St. Petersburg', state: 'FL', zip: '33701', lng: -82.6403, lat: 27.7676 },
  { city: 'Tallahassee', state: 'FL', zip: '32301', lng: -84.2807, lat: 30.4383 },
  // Philadelphia, PA
  { city: 'Philadelphia', state: 'PA', zip: '19107', lng: -75.1652, lat: 39.9526 },
  { city: 'Philadelphia', state: 'PA', zip: '19103', lng: -75.1745, lat: 39.952 },
  { city: 'Philadelphia', state: 'PA', zip: '19147', lng: -75.1545, lat: 39.934 },
  { city: 'Philadelphia', state: 'PA', zip: '19123', lng: -75.1452, lat: 39.967 },
];

const PLANS_CYCLE: (keyof typeof PLANS)[] = ['basic', 'core', 'pro'];
const NAME_PREFIXES = [
  'Samarkand', 'Bukhara', 'Tashkent', 'Khiva', 'Fergana', 'Andijan', 'Namangan', 'Termez', 'Nukus', 'Karshi',
  'Registan', 'Silk Road', 'Plov', 'Lagman', 'Manti', 'Shashlik', 'Somsa', 'Navruz', 'Chorsu', 'Bibi',
  'Amir', 'Timur', 'Alisher', 'Navoi', 'Ulugbek', 'Bobur', 'Khan', 'Sultan', 'Emir', 'Diyor',
  'Anor', 'Anjir', 'Shaftoli', 'Uzum', 'Qovun', 'Non', 'Osh', 'Choy', 'Qazi', 'Halim',
  'Golden Plov', 'Blue Domes', 'Caravan', 'Bazaar', 'Teahouse', 'Garden', 'Palace', 'House', 'Kitchen', 'Grill',
  'East', 'Orient', 'Steppe', 'Oasis', 'Valley', 'Mountain', 'River', 'Desert', 'Meadow', 'Market',
  'Family', 'Heritage', 'Legacy', 'Royal', 'Noble', 'Ancient', 'Modern', 'Classic', 'Fresh', 'Home',
  'Sunrise', 'Sunset', 'Moon', 'Star', 'Pearl', 'Ruby', 'Jade', 'Copper', 'Silver', 'Gold',
  'Cedar', 'Maple', 'Olive', 'Pomegranate', 'Fig', 'Mulberry', 'Walnut', 'Almond', 'Apricot', 'Melon',
  'Harbor', 'Bridge', 'Canal', 'Pier', 'Corner', 'Avenue',
];
const NAME_SUFFIXES = [
  'Choyxona', 'Oshxona', 'Grill', 'Kitchen', 'House', 'Palace', 'Cafe', 'Restaurant', 'Bistro', 'Table',
  'Dining', 'Lounge', 'Hall', 'Garden', 'Express',
];

function buildExtraRestaurants(count: number): RestaurantSeed[] {
  const out: RestaurantSeed[] = [];
  for (let i = 0; i < count; i++) {
    const loc = CITIES[i % CITIES.length]!;
    const prefix = NAME_PREFIXES[i % NAME_PREFIXES.length]!;
    const suffix = NAME_SUFFIXES[Math.floor(i / NAME_PREFIXES.length) % NAME_SUFFIXES.length]!;
    const name = `${prefix} ${suffix} ${i + 1}`;
    const statusRoll = i % 17;
    const status: RestaurantSeed['status'] =
      statusRoll === 0 ? 'pending' : statusRoll === 1 ? 'suspended' : 'approved';
    const priceRange = (i % 4) + 1;
    const depositRequired = i % 5 === 0;
    const plan = status === 'pending' ? undefined : PLANS_CYCLE[i % PLANS_CYCLE.length];
    const jitter = ((i % 7) - 3) * 0.008;

    out.push({
      name,
      cuisine: 'Uzbek',
      priceRange,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      lng: loc.lng + jitter,
      lat: loc.lat + jitter * 0.6,
      description: `Authentic Uzbek cuisine in ${loc.city}, ${loc.state} — seed venue #${i + 1}.`,
      depositRequired,
      depositAmountCents: depositRequired ? 1000 + (i % 5) * 500 : 0,
      status,
      plan,
      rating: status === 'pending' ? undefined : Math.round((3.5 + (i % 15) * 0.1) * 10) / 10,
      reviewCount: status === 'pending' ? undefined : 5 + (i % 40) * 3,
    });
  }
  return out;
}

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

  const featuredRestaurants: RestaurantSeed[] = [
    {
      name: 'Samarkand Palace',
      cuisine: 'Uzbek',
      priceRange: 4,
      city: 'New York',
      state: 'NY',
      zip: '10013',
      lng: -74.0059,
      lat: 40.7195,
      description: 'Wood-fired plov and charcoal shashlik in Tribeca.',
      depositRequired: true,
      depositAmountCents: 2500,
      status: 'approved',
      plan: 'pro',
      rating: 4.7,
      reviewCount: 128,
    },
    {
      name: 'Tashkent House',
      cuisine: 'Uzbek',
      priceRange: 3,
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      lng: -73.9903,
      lat: 40.6943,
      description: 'Home-style lagman and manti near Downtown Brooklyn.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'core',
      rating: 4.5,
      reviewCount: 96,
    },
    {
      name: 'Bukhara Grill',
      cuisine: 'Uzbek',
      priceRange: 3,
      city: 'Philadelphia',
      state: 'PA',
      zip: '19107',
      lng: -75.1652,
      lat: 39.9526,
      description: 'Bukharan Jewish and Uzbek classics in Center City.',
      depositRequired: true,
      depositAmountCents: 1500,
      status: 'approved',
      plan: 'core',
      rating: 4.6,
      reviewCount: 74,
    },
    {
      name: 'Choyxona Jersey',
      cuisine: 'Uzbek',
      priceRange: 2,
      city: 'Jersey City',
      state: 'NJ',
      zip: '07302',
      lng: -74.0431,
      lat: 40.7178,
      description: 'Teahouse vibes with somsa and green tea downtown.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'basic',
      rating: 4.3,
      reviewCount: 51,
    },
    {
      name: 'Plov Center Miami',
      cuisine: 'Uzbek',
      priceRange: 3,
      city: 'Miami',
      state: 'FL',
      zip: '33131',
      lng: -80.1918,
      lat: 25.7617,
      description: 'Giant kazan plov and family-style feasts in Brickell.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'approved',
      plan: 'pro',
      rating: 4.4,
      reviewCount: 88,
    },
    {
      name: 'Silk Road Cafe',
      cuisine: 'Uzbek',
      priceRange: 3,
      city: 'Newark',
      state: 'NJ',
      zip: '07102',
      lng: -74.1724,
      lat: 40.7357,
      description: 'Cozy Newark cafe awaiting approval.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'pending',
    },
    {
      name: 'Fergana Kitchen',
      cuisine: 'Uzbek',
      priceRange: 2,
      city: 'Orlando',
      state: 'FL',
      zip: '32801',
      lng: -81.3792,
      lat: 28.5383,
      description: 'Temporarily suspended for policy review.',
      depositRequired: false,
      depositAmountCents: 0,
      status: 'suspended',
      plan: 'basic',
      rating: 3.8,
      reviewCount: 22,
    },
  ];

  const restaurantsData: RestaurantSeed[] = [...featuredRestaurants, ...buildExtraRestaurants(93)];

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

    if (r.name === 'Samarkand Palace') {
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

      const sections = MENUS[r.cuisine] ?? MENUS.Uzbek!;
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

  const samarkand = created.find((c) => c.restaurant.name === 'Samarkand Palace')!;
  const tashkent = created.find((c) => c.restaurant.name === 'Tashkent House')!;
  const bukhara = created.find((c) => c.restaurant.name === 'Bukhara Grill')!;
  const choyxona = created.find((c) => c.restaurant.name === 'Choyxona Jersey')!;
  const plov = created.find((c) => c.restaurant.name === 'Plov Center Miami')!;

  await Blackout.insertMany([
    {
      restaurantId: samarkand.restaurant._id,
      date: dateStr(14),
      reason: 'Private buyout',
      allDay: true,
    },
    {
      restaurantId: tashkent.restaurant._id,
      date: dateStr(7),
      reason: 'Kitchen renovation (lunch only)',
      allDay: false,
      startTime: '11:30',
      endTime: '14:30',
    },
    {
      restaurantId: bukhara.restaurant._id,
      date: dateStr(21),
      reason: 'New Year staff party',
      allDay: true,
    },
  ]);

  const completedSamarkand = await Reservation.create({
    restaurantId: samarkand.restaurant._id,
    dinerId: diner!._id,
    tableIds: [samarkand.tables[1]!._id],
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

  const completedTashkent = await Reservation.create({
    restaurantId: tashkent.restaurant._id,
    dinerId: diner!._id,
    tableIds: [tashkent.tables[2]!._id],
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

  const completedBukhara = await Reservation.create({
    restaurantId: bukhara.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [bukhara.tables[0]!._id],
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
    restaurantId: samarkand.restaurant._id,
    dinerId: diner!._id,
    tableIds: [samarkand.tables[1]!._id],
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
    restaurantId: tashkent.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [tashkent.tables[3]!._id],
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
    restaurantId: choyxona.restaurant._id,
    dinerId: diner!._id,
    tableIds: [choyxona.tables[1]!._id],
    partySize: 3,
    ...slot(0, 18),
    status: 'pending',
    occasion: 'none',
    depositAmountCents: 0,
    depositStatus: 'none',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: plov.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [plov.tables[4]!._id],
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
    restaurantId: bukhara.restaurant._id,
    dinerId: diner!._id,
    tableIds: [bukhara.tables[2]!._id],
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
    restaurantId: samarkand.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [samarkand.tables[0]!._id],
    partySize: 2,
    ...slot(-5, 20),
    status: 'no_show',
    occasion: 'date',
    depositAmountCents: 5000,
    depositStatus: 'captured',
    source: 'network',
  });

  // Same-evening inventory pressure at Samarkand Palace (multiple tables booked)
  await Reservation.create({
    restaurantId: samarkand.restaurant._id,
    dinerId: diner2!._id,
    tableIds: [samarkand.tables[3]!._id],
    partySize: 4,
    ...slot(1, 19),
    status: 'confirmed',
    occasion: 'business',
    depositAmountCents: 10000,
    depositStatus: 'authorized',
    source: 'network',
  });

  await Reservation.create({
    restaurantId: samarkand.restaurant._id,
    dinerId: diner!._id,
    tableIds: [samarkand.tables[4]!._id],
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
      restaurantId: samarkand.restaurant._id,
      dinerId: diner!._id,
      reservationId: completedSamarkand._id,
      rating: 5,
      comment: 'Perfect anniversary dinner — the plov was exceptional.',
    },
    {
      restaurantId: tashkent.restaurant._id,
      dinerId: diner!._id,
      reservationId: completedTashkent._id,
      rating: 4,
      comment: 'Great lagman and friendly staff. A bit noisy on weekends.',
    },
    {
      restaurantId: bukhara.restaurant._id,
      dinerId: diner2!._id,
      reservationId: completedBukhara._id,
      rating: 5,
      comment: 'Best shashlik in the neighborhood.',
    },
  ]);

  await WaitlistEntry.insertMany([
    {
      restaurantId: samarkand.restaurant._id,
      dinerId: diner2!._id,
      partySize: 2,
      preferredDate: dateStr(1),
      preferredTimeStart: '19:00',
      preferredTimeEnd: '21:00',
      status: 'waiting',
    },
    {
      restaurantId: bukhara.restaurant._id,
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
      restaurantId: tashkent.restaurant._id,
      dinerId: diner2!._id,
      partySize: 2,
      preferredDate: dateStr(-1),
      preferredTimeStart: '19:00',
      preferredTimeEnd: '21:00',
      status: 'expired',
    },
    {
      restaurantId: choyxona.restaurant._id,
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
      reservationId: completedSamarkand._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Samarkand Palace',
    },
    {
      userId: diner!._id,
      reservationId: completedTashkent._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Tashkent House',
    },
    {
      userId: diner!._id,
      type: 'earn',
      points: 50,
      description: 'Deposit points from Samarkand Palace',
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
      reservationId: completedBukhara._id,
      type: 'earn',
      points: 100,
      description: 'Completed visit at Bukhara Grill',
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
      body: 'Your table at Samarkand Palace tomorrow at 7:00 PM is confirmed.',
      status: 'sent',
      sentAt: atOffset(0, 8),
      data: { restaurantName: 'Samarkand Palace' },
    },
    {
      userId: diner!._id,
      channel: 'push',
      type: 'reminder',
      title: 'Reminder: dinner tomorrow',
      body: 'Samarkand Palace — party of 2 at 7:00 PM.',
      status: 'queued',
    },
    {
      userId: diner2!._id,
      channel: 'email',
      type: 'waitlist_notified',
      title: 'A table opened up',
      body: 'Bukhara Grill has a table for 4 on your preferred date.',
      status: 'sent',
      sentAt: atOffset(0, 9),
    },
    {
      userId: owner!._id,
      channel: 'email',
      type: 'new_reservation',
      title: 'New reservation',
      body: 'Dan Diner booked a party of 2 at Samarkand Palace.',
      status: 'sent',
      sentAt: atOffset(0, 8),
    },
  ]);

  const period = atOffset(0).toISOString().slice(0, 7);
  await CoverFee.insertMany([
    {
      restaurantId: samarkand.restaurant._id,
      reservationId: completedSamarkand._id,
      dinerId: diner!._id,
      partySize: 2,
      source: 'network',
      feeCents: PLANS.pro.networkCoverFeeCents * 2,
      status: 'charged',
      billingPeriod: period,
    },
    {
      restaurantId: tashkent.restaurant._id,
      reservationId: completedTashkent._id,
      dinerId: diner!._id,
      partySize: 4,
      source: 'website',
      feeCents: 0,
      status: 'waived',
      billingPeriod: period,
    },
    {
      restaurantId: bukhara.restaurant._id,
      reservationId: completedBukhara._id,
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
  console.log('  staff@reservations.local   — staff at Samarkand Palace');
  console.log('  diner@reservations.local   — diner (750 pts)');
  console.log('  diner2@reservations.local  — second diner (200 pts)');
  console.log('');
  console.log('Data summary:');
  const approved = restaurantsData.filter((r) => r.status === 'approved').length;
  const pending = restaurantsData.filter((r) => r.status === 'pending').length;
  const suspended = restaurantsData.filter((r) => r.status === 'suspended').length;
  console.log(`  ${restaurantsData.length} restaurants (${approved} approved, ${pending} pending, ${suspended} suspended)`);
  console.log('  Reservations across statuses: pending, confirmed, seated, completed, cancelled, no_show');
  console.log('  Reviews, waitlist entries, blackouts, loyalty, notifications, subscriptions, cover fees');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
