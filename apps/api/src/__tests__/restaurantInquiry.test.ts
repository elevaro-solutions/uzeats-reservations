import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { RestaurantInquiry } from '../models/RestaurantInquiry.js';
import { User } from '../models/User.js';
import { sendRestaurantInquiry } from '../services/restaurantInquiry.js';

async function seedRestaurant(ownerEmail: string) {
  const owner = await User.create({
    email: ownerEmail,
    passwordHash: 'x',
    firstName: 'Ina',
    lastName: 'Owner',
    role: 'restaurant_owner',
  });
  return Restaurant.create({
    name: 'Inquiry Kitchen',
    slug: `inquiry-${Date.now()}`,
    cuisine: 'Uzbek',
    priceRange: 2,
    status: 'approved',
    ownerId: owner._id,
    address: { line1: '1 Test', city: 'T', state: 'CA', zip: '90001' },
    location: { type: 'Point', coordinates: [-118.24, 34.05] },
  });
}

describe('sendRestaurantInquiry', () => {
  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
  });

  it('stores the message even when the owner email cannot be delivered', async () => {
    const restaurant = await seedRestaurant('owner@tablevera.local');
    const result = await sendRestaurantInquiry(
      {
        restaurantId: restaurant._id.toString(),
        message: '<p>Do you have a table for 12?</p>',
        name: 'Behruz',
        email: 'diner@example.org',
      },
      {},
    );
    expect(result.success).toBe(true);
    const stored = await RestaurantInquiry.find({ restaurantId: restaurant._id });
    expect(stored).toHaveLength(1);
  });

  it('returns a validation error instead of a server error for an empty rich-text message', async () => {
    const restaurant = await seedRestaurant('owner2@tablevera.local');
    await expect(
      sendRestaurantInquiry(
        {
          restaurantId: restaurant._id.toString(),
          message: '<p></p>',
          name: 'Behruz',
          email: 'diner@example.org',
        },
        {},
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
