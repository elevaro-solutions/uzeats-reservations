import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';
import { ReviewReaction } from '../models/ReviewReaction.js';
import { signAccessToken } from '../services/auth.js';

const UPDATE = `
  mutation UpdateReview($reviewId: ID!, $input: UpdateReviewInput!) {
    updateReview(reviewId: $reviewId, input: $input) {
      id rating foodRating serviceRating atmosphereRating comment photos
    }
  }
`;

const REACT = `
  mutation ReactToReview($reviewId: ID!, $reaction: ReviewReactionType!) {
    reactToReview(reviewId: $reviewId, reaction: $reaction) {
      id
      myReaction
      reactionCounts { love helpful amazing yum omg total }
    }
  }
`;

const REVIEWS = `
  query RestaurantReviews($restaurantId: ID!) {
    restaurantReviews(restaurantId: $restaurantId) {
      items {
        id
        myReaction
        reactionCounts { love total }
      }
    }
  }
`;

describe('updateReview and reactToReview', () => {
  let agent: request.Agent;
  let authorToken: string;
  let otherToken: string;
  let restaurantId: string;
  let reviewId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const author = await User.create({
      email: 'author-edit-review@test.com',
      passwordHash: 'unused',
      firstName: 'Ann',
      lastName: 'Author',
      role: 'diner',
    });
    authorToken = signAccessToken({ sub: author._id.toString(), role: 'diner' });

    const other = await User.create({
      email: 'other-react-review@test.com',
      passwordHash: 'unused',
      firstName: 'Oli',
      lastName: 'Other',
      role: 'diner',
    });
    otherToken = signAccessToken({ sub: other._id.toString(), role: 'diner' });

    const restaurant = await Restaurant.create({
      name: 'Edit React Bistro',
      slug: 'edit-react-bistro',
      ownerId: author._id,
      status: 'approved',
      cuisine: 'Italian',
      priceRange: 2,
      averageRating: 4,
      reviewCount: 1,
      address: { line1: '1 Main', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.9, 40.7] },
    });
    restaurantId = restaurant._id.toString();

    const reservation = await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: author._id,
      tableIds: [],
      partySize: 2,
      slotStart: new Date(Date.now() - 86400000),
      slotEnd: new Date(Date.now() - 82800000),
      status: 'completed',
      source: 'network',
    });

    const review = await Review.create({
      restaurantId: restaurant._id,
      dinerId: author._id,
      reservationId: reservation._id,
      rating: 4,
      foodRating: 4,
      serviceRating: 4,
      atmosphereRating: 4,
      comment: 'Solid meal',
    });
    reviewId = review._id.toString();
  });

  it('lets the author edit their review and recalculates restaurant stats', async () => {
    const denied = await graphqlRequest(
      agent,
      UPDATE,
      {
        reviewId,
        input: {
          rating: 5,
          foodRating: 5,
          serviceRating: 5,
          atmosphereRating: 5,
          comment: 'Even better',
        },
      },
      otherToken,
    );
    expect(denied.body.errors).toBeDefined();

    const res = await graphqlRequest(
      agent,
      UPDATE,
      {
        reviewId,
        input: {
          rating: 5,
          foodRating: 5,
          serviceRating: 5,
          atmosphereRating: 5,
          comment: 'Even better',
          photos: [],
        },
      },
      authorToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateReview.rating).toBe(5);
    expect(res.body.data.updateReview.comment).toBe('Even better');

    const restaurant = await Restaurant.findById(restaurantId);
    expect(restaurant?.averageRating).toBe(5);
    expect(restaurant?.reviewCount).toBe(1);
  });

  it('lets another diner react, toggle, and clear a Google-style reaction', async () => {
    const own = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'love' },
      authorToken,
    );
    expect(own.body.errors?.[0]?.message).toMatch(/own review/i);

    const love = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'love' },
      otherToken,
    );
    expect(love.body.errors).toBeUndefined();
    expect(love.body.data.reactToReview.myReaction).toBe('love');
    expect(love.body.data.reactToReview.reactionCounts.love).toBe(1);
    expect(love.body.data.reactToReview.reactionCounts.total).toBe(1);

    const yum = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'yum' },
      otherToken,
    );
    expect(yum.body.data.reactToReview.myReaction).toBe('yum');
    expect(yum.body.data.reactToReview.reactionCounts.love).toBe(0);
    expect(yum.body.data.reactToReview.reactionCounts.yum).toBe(1);

    const clear = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'yum' },
      otherToken,
    );
    expect(clear.body.data.reactToReview.myReaction).toBeNull();
    expect(clear.body.data.reactToReview.reactionCounts.total).toBe(0);
    expect(await ReviewReaction.countDocuments({ reviewId })).toBe(0);

    const list = await graphqlRequest(agent, REVIEWS, { restaurantId }, otherToken);
    expect(list.body.data.restaurantReviews.items[0].reactionCounts.total).toBe(0);
  });

  it('lets guests react with X-Visitor-Key and no auth', async () => {
    const visitorKey = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const noKey = await graphqlRequest(agent, REACT, { reviewId, reaction: 'helpful' });
    expect(noKey.body.errors?.[0]?.message).toMatch(/visitor key/i);

    const love = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'love' },
      undefined,
      { 'X-Visitor-Key': visitorKey },
    );
    expect(love.body.errors).toBeUndefined();
    expect(love.body.data.reactToReview.myReaction).toBe('love');
    expect(love.body.data.reactToReview.reactionCounts.love).toBe(1);

    const list = await graphqlRequest(
      agent,
      REVIEWS,
      { restaurantId },
      undefined,
      { 'X-Visitor-Key': visitorKey },
    );
    expect(list.body.data.restaurantReviews.items[0].myReaction).toBe('love');

    const clear = await graphqlRequest(
      agent,
      REACT,
      { reviewId, reaction: 'love' },
      undefined,
      { 'X-Visitor-Key': visitorKey },
    );
    expect(clear.body.data.reactToReview.myReaction).toBeNull();
    expect(clear.body.data.reactToReview.reactionCounts.total).toBe(0);
  });
});
