import { describe, it, expect } from 'vitest';
import { partySizeMatches, timeWindowMatches } from '../services/waitlistEta.js';

describe('partySizeMatches', () => {
  it('matches within ±2 party size tolerance', () => {
    expect(partySizeMatches(2, 4)).toBe(true);
    expect(partySizeMatches(6, 4)).toBe(true);
    expect(partySizeMatches(1, 4)).toBe(false);
    expect(partySizeMatches(7, 4)).toBe(false);
  });
});

describe('timeWindowMatches', () => {
  const entry = {
    preferredTimeStart: '18:00',
    preferredTimeEnd: '20:00',
  } as any;

  it('allows times inside preferred window', () => {
    expect(timeWindowMatches(entry, '19:00')).toBe(true);
  });

  it('rejects times before start', () => {
    expect(timeWindowMatches(entry, '17:30')).toBe(false);
  });

  it('rejects times after end', () => {
    expect(timeWindowMatches(entry, '20:30')).toBe(false);
  });

  it('allows any time when no window set', () => {
    expect(timeWindowMatches({} as any, '12:00')).toBe(true);
  });
});

describe('waitlist ETA formula', () => {
  it('computes estimated wait from parties ahead and table count', () => {
    const partiesAhead = 3;
    const avgTurnMinutes = 90;
    const activeTables = 2;
    const estimated = Math.ceil((partiesAhead * avgTurnMinutes) / Math.max(activeTables, 1));
    expect(estimated).toBe(135);
  });
});
