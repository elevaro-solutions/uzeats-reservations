import { describe, it, expect } from 'vitest';
import { slotKeysForRange } from '../services/tableSlotClaims.js';

describe('slotKeysForRange', () => {
  it('emits half-open 15-minute quanta', () => {
    const start = new Date('2026-07-19T18:00:00.000Z');
    const end = new Date('2026-07-19T19:30:00.000Z');
    expect(slotKeysForRange(start, end)).toEqual([
      '2026-07-19T18:00:00.000Z',
      '2026-07-19T18:15:00.000Z',
      '2026-07-19T18:30:00.000Z',
      '2026-07-19T18:45:00.000Z',
      '2026-07-19T19:00:00.000Z',
      '2026-07-19T19:15:00.000Z',
    ]);
  });

  it('floors unaligned starts into the covering quantum', () => {
    const start = new Date('2026-07-19T18:05:00.000Z');
    const end = new Date('2026-07-19T18:20:00.000Z');
    expect(slotKeysForRange(start, end)).toEqual([
      '2026-07-19T18:00:00.000Z',
      '2026-07-19T18:15:00.000Z',
    ]);
  });
});
