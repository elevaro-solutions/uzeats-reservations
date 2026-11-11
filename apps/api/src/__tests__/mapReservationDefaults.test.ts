import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { mapReservation } from '../graphql/mappers.js';

describe('mapReservation defaults for legacy rows', () => {
  it('fills non-null fields so one bad row cannot blank the whole list', () => {
    const slotStart = new Date('2026-11-01T18:00:00.000Z');
    const mapped = mapReservation({
      _id: new Types.ObjectId(),
      restaurantId: new Types.ObjectId(),
      dinerId: new Types.ObjectId(),
      partySize: 2,
      slotStart,
      slotEnd: null,
      status: 'confirmed',
      occasion: null,
      depositStatus: null,
      depositAmountCents: null,
      loyaltyPointsEarned: null,
      loyaltyPointsRedeemed: undefined,
    });
    expect(mapped.occasion).toBe('none');
    expect(mapped.depositStatus).toBe('none');
    expect(mapped.depositAmountCents).toBe(0);
    expect(mapped.slotEnd).toEqual(slotStart);
    expect(mapped.loyaltyPointsEarned).toBe(0);
    expect(mapped.loyaltyPointsRedeemed).toBe(0);
  });

  it('maps an unknown legacy occasion to other', () => {
    const mapped = mapReservation({
      _id: new Types.ObjectId(),
      restaurantId: new Types.ObjectId(),
      dinerId: new Types.ObjectId(),
      partySize: 2,
      slotStart: new Date(),
      status: 'confirmed',
      occasion: 'graduation',
    });
    expect(mapped.occasion).toBe('other');
  });
});
