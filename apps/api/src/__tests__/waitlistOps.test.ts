import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WAITLIST_NOTIFY_HOLD_MINUTES,
  canPartnerTransitionWaitlist,
  formatWaitlistWaitingLabel,
  isWaitlistWaitOverdue,
  preferredWindowFromHm,
  updateWaitlistEntryInputSchema,
  waitlistPromisedMinutes,
  waitlistWaitingMinutes,
} from '@reservations/shared';
import { assertPartnerWaitlistTransition } from '../services/waitlist.js';
import { expireStaleNotifiedWaitlistEntries } from '../services/waitlist.js';
import { WaitlistEntry } from '../models/Waitlist.js';

vi.mock('../services/notifications.js', () => ({
  notifyUser: vi.fn(async () => undefined),
  sendSms: vi.fn(async () => undefined),
}));

vi.mock('../services/plans.js', () => ({
  hasPremiumSms: vi.fn(async () => true),
}));

describe('waitlist partner transitions', () => {
  it('allows notify / seat / cancel from waiting', () => {
    expect(canPartnerTransitionWaitlist('waiting', 'notified')).toBe(true);
    expect(canPartnerTransitionWaitlist('waiting', 'seated')).toBe(true);
    expect(canPartnerTransitionWaitlist('waiting', 'cancelled')).toBe(true);
  });

  it('blocks invalid jumps', () => {
    expect(canPartnerTransitionWaitlist('waiting', 'booked')).toBe(false);
    expect(canPartnerTransitionWaitlist('seated', 'waiting')).toBe(false);
    expect(() => assertPartnerWaitlistTransition('booked', 'waiting')).toThrow(
      /Cannot change waitlist status/,
    );
  });
});

describe('preferredWindowFromHm', () => {
  it('builds a +2h window', () => {
    expect(preferredWindowFromHm('19:00')).toEqual({
      preferredTimeStart: '19:00',
      preferredTimeEnd: '21:00',
    });
  });

  it('wraps past midnight', () => {
    expect(preferredWindowFromHm('23:00')).toEqual({
      preferredTimeStart: '23:00',
      preferredTimeEnd: '01:00',
    });
  });
});

describe('updateWaitlistEntryInputSchema', () => {
  it('requires at least one field besides id', () => {
    expect(() => updateWaitlistEntryInputSchema.parse({ id: 'abc' })).toThrow();
  });

  it('accepts party size and null diner unlink', () => {
    const parsed = updateWaitlistEntryInputSchema.parse({
      id: 'abc',
      partySize: 4,
      dinerId: null,
      guestPhone: '',
      quotedWaitMinutes: null,
    });
    expect(parsed.partySize).toBe(4);
    expect(parsed.dinerId).toBeNull();
    expect(parsed.guestPhone).toBe('');
  });
});

describe('searchWaitlistGuests phone digit matching', () => {
  it('builds a digit-tolerant phone regex', () => {
    const digits = '212555';
    const re = new RegExp(digits.split('').join('\\D*'));
    expect(re.test('+12125551234')).toBe(true);
    expect(re.test('(212) 555-9999')).toBe(true);
    expect(re.test('+14155551234')).toBe(false);
  });
});

describe('waitlist waiting / overdue helpers', () => {
  it('computes elapsed waiting minutes', () => {
    const createdAt = new Date('2026-10-03T12:00:00.000Z');
    const now = new Date('2026-10-03T12:23:00.000Z');
    expect(waitlistWaitingMinutes(createdAt, now)).toBe(23);
  });

  it('prefers quoted wait as promised', () => {
    expect(
      waitlistPromisedMinutes({
        quotedWaitMinutes: 20,
        estimatedWaitMinutes: 40,
      }),
    ).toBe(20);
  });

  it('marks overdue past promised wait', () => {
    expect(
      isWaitlistWaitOverdue({
        status: 'waiting',
        waitingMinutes: 25,
        quotedWaitMinutes: 20,
      }),
    ).toBe(true);
    expect(
      isWaitlistWaitOverdue({
        status: 'waiting',
        waitingMinutes: 15,
        quotedWaitMinutes: 20,
      }),
    ).toBe(false);
  });

  it('formats waiting labels', () => {
    expect(formatWaitlistWaitingLabel(12)).toBe('12 min');
    expect(formatWaitlistWaitingLabel(65)).toBe('1h 05m');
  });
});

describe('expireStaleNotifiedWaitlistEntries', () => {
  const restaurantId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.spyOn(WaitlistEntry, 'find').mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses notify hold constant', () => {
    expect(WAITLIST_NOTIFY_HOLD_MINUTES).toBe(15);
  });

  it('returns zeros when nothing is stale', async () => {
    const result = await expireStaleNotifiedWaitlistEntries();
    expect(result).toEqual({ expired: 0, cascaded: 0 });
  });

  it('expires stale notified entries', async () => {
    const save = vi.fn(async () => undefined);
    const stale = {
      _id: { toString: () => 'wl1' },
      restaurantId,
      partySize: 2,
      status: 'notified',
      notifiedSlot: null,
      save,
    };
    vi.spyOn(WaitlistEntry, 'find').mockReturnValue({
      limit: vi.fn().mockResolvedValue([stale]),
    } as any);

    const result = await expireStaleNotifiedWaitlistEntries();
    expect(stale.status).toBe('expired');
    expect(save).toHaveBeenCalled();
    expect(result.expired).toBe(1);
    expect(result.cascaded).toBe(0);
  });
});
