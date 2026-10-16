import { describe, expect, it } from 'vitest';
import {
  canPartnerTransitionWaitlist,
  formatWaitlistWaitingLabel,
  isActiveWaitlistWaitStatus,
  isTerminalWaitlistStatus,
  isWaitlistWaitOverdue,
  preferredWindowFromHm,
  waitlistPromisedMinutes,
  waitlistWaitingMinutes,
} from '../waitlist.js';

describe('waitlist', () => {
  it('builds preferred windows from HH:mm', () => {
    expect(preferredWindowFromHm('18:00', 120)).toEqual({
      preferredTimeStart: '18:00',
      preferredTimeEnd: '20:00',
    });
    expect(preferredWindowFromHm('23:30', 60)).toEqual({
      preferredTimeStart: '23:30',
      preferredTimeEnd: '00:30',
    });
    expect(preferredWindowFromHm('bad')).toBeNull();
  });

  it('allows partner transitions only on active statuses', () => {
    expect(canPartnerTransitionWaitlist('waiting', 'notified')).toBe(true);
    expect(canPartnerTransitionWaitlist('waiting', 'seated')).toBe(true);
    expect(canPartnerTransitionWaitlist('notified', 'cancelled')).toBe(true);
    expect(canPartnerTransitionWaitlist('waiting', 'booked')).toBe(false);
    expect(canPartnerTransitionWaitlist('booked', 'waiting')).toBe(false);
  });

  it('classifies terminal and active wait statuses', () => {
    expect(isTerminalWaitlistStatus('booked')).toBe(true);
    expect(isTerminalWaitlistStatus('expired')).toBe(true);
    expect(isTerminalWaitlistStatus('waiting')).toBe(false);
    expect(isActiveWaitlistWaitStatus('waiting')).toBe(true);
    expect(isActiveWaitlistWaitStatus('notified')).toBe(true);
    expect(isActiveWaitlistWaitStatus('seated')).toBe(false);
  });

  it('computes waiting minutes and overdue against quote/default', () => {
    const created = new Date('2026-10-14T12:00:00.000Z');
    const now = new Date('2026-10-14T12:50:00.000Z');
    expect(waitlistWaitingMinutes(created, now)).toBe(50);
    expect(waitlistPromisedMinutes({ quotedWaitMinutes: 30 })).toBe(30);
    expect(waitlistPromisedMinutes({})).toBe(45);
    expect(
      isWaitlistWaitOverdue({
        status: 'waiting',
        waitingMinutes: 50,
        quotedWaitMinutes: 30,
      }),
    ).toBe(true);
    expect(
      isWaitlistWaitOverdue({
        status: 'booked',
        waitingMinutes: 50,
        quotedWaitMinutes: 30,
      }),
    ).toBe(false);
  });

  it('formats wait labels', () => {
    expect(formatWaitlistWaitingLabel(12)).toBe('12 min');
    expect(formatWaitlistWaitingLabel(60)).toBe('1h');
    expect(formatWaitlistWaitingLabel(65)).toBe('1h 05m');
  });
});
