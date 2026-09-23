import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';
import { signAccessToken } from '../services/auth.js';

const REPORT = `
  mutation ReportReview($reviewId: ID!, $reason: ReviewReportReason!, $details: String) {
    reportReview(reviewId: $reviewId, reason: $reason, details: $details) {
      id flagged flagReason flagReasonCode flagDetails hidden
    }
  }
`;

const SET_HIDDEN = `
  mutation SetReviewHidden($reviewId: ID!, $hidden: Boolean!) {
    setReviewHidden(reviewId: $reviewId, hidden: $hidden) { id hidden }
  }
`;

const FLAGGED = `
  query FlaggedContent {
    flaggedContent(limit: 50) {
      reviews { id flagReasonCode flagDetails flagReason }
    }
  }
`;

describe('Owner review reports', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let otherOwnerToken: string;
  let dinerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let reviewId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await User.create({
      email: 'owner-review-report@test.com',
      passwordHash: 'unused',
      firstName: 'Olivia',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    ownerToken = signAccessToken({
      sub: owner._id.toString(),
      role: 'restaurant_owner',
    });

    const otherOwner = await User.create({
      email: 'other-owner-review-report@test.com',
      passwordHash: 'unused',
      firstName: 'Other',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    otherOwnerToken = signAccessToken({
      sub: otherOwner._id.toString(),
      role: 'restaurant_owner',
    });

    const diner = await User.create({
      email: 'diner-review-report@test.com',
      passwordHash: 'unused',
      firstName: 'Dan',
      lastName: 'Diner',
      role: 'diner',
    });
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const admin = await User.create({
      email: 'admin-review-report@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const restaurant = await Restaurant.create({
      name: 'Report Bistro',
      slug: 'report-bistro',
      ownerId: owner._id,
      status: 'approved',
      cuisine: 'Italian',
      priceRange: 2,
      address: { line1: '1 Main', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.9, 40.7] },
    });
    restaurantId = restaurant._id.toString();

    const reservation = await Reservation.create({
      restaurantId: restaurant._id,
      dinerId: diner._id,
      tableIds: [],
      partySize: 2,
      slotStart: new Date(Date.now() - 86400000),
      slotEnd: new Date(Date.now() - 82800000),
      status: 'completed',
      source: 'network',
    });

    const review = await Review.create({
      restaurantId: restaurant._id,
      dinerId: diner._id,
      reservationId: reservation._id,
      rating: 1,
      comment: 'This place is a scam and the owner is a crook',
    });
    reviewId = review._id.toString();
  });

  it('lets the venue owner report with a policy reason without hiding', async () => {
    const res = await graphqlRequest(
      agent,
      REPORT,
      {
        reviewId,
        reason: 'hate_or_harassment',
        details: 'Personal attack naming staff with threats',
      },
      ownerToken,
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.reportReview.flagged).toBe(true);
    expect(res.body.data.reportReview.hidden).toBe(false);
    expect(res.body.data.reportReview.flagReasonCode).toBe('hate_or_harassment');
    expect(res.body.data.reportReview.flagDetails).toContain('Personal attack');
  });

  it('requires details when reason is other', async () => {
    const res = await graphqlRequest(
      agent,
      REPORT,
      { reviewId, reason: 'other', details: 'short' },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/at least 10/i);
  });

  it('rejects report from another restaurant owner', async () => {
    const res = await graphqlRequest(
      agent,
      REPORT,
      { reviewId, reason: 'spam' },
      otherOwnerToken,
    );
    expect(res.body.errors).toBeDefined();
  });

  it('rejects partner hide; allows admin hide', async () => {
    const ownerHide = await graphqlRequest(
      agent,
      SET_HIDDEN,
      { reviewId, hidden: true },
      ownerToken,
    );
    expect(ownerHide.body.errors).toBeDefined();

    const dinerHide = await graphqlRequest(
      agent,
      SET_HIDDEN,
      { reviewId, hidden: true },
      dinerToken,
    );
    expect(dinerHide.body.errors).toBeDefined();

    const adminHide = await graphqlRequest(
      agent,
      SET_HIDDEN,
      { reviewId, hidden: true },
      adminToken,
    );
    expect(adminHide.body.errors).toBeUndefined();
    expect(adminHide.body.data.setReviewHidden.hidden).toBe(true);
  });

  it('surfaces the report in flaggedContent for admins', async () => {
    // re-report so it is flagged again after any earlier state
    await graphqlRequest(
      agent,
      REPORT,
      { reviewId, reason: 'spam', details: 'Repeated promo links' },
      ownerToken,
    );

    const res = await graphqlRequest(agent, FLAGGED, {}, adminToken);
    expect(res.body.errors).toBeUndefined();
    const found = res.body.data.flaggedContent.reviews.find((r: any) => r.id === reviewId);
    expect(found).toBeTruthy();
    expect(found.flagReasonCode).toBe('spam');
  });

  it('persists structured fields on the review document', async () => {
    const doc = await Review.findById(reviewId);
    expect(doc?.flagged).toBe(true);
    expect(doc?.flagReasonCode).toBe('spam');
    expect(restaurantId).toBeTruthy();
  });
});
