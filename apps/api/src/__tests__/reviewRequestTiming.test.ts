import { describe, expect, it } from 'vitest';
import {
  REVIEW_REQUEST_PREFERRED_LOCAL_HOUR,
  hmInTimeZone,
  isoDateInTimeZone,
} from '@reservations/shared';
import { computeReviewRequestSendAt } from '../services/reviewRequest.js';

describe('computeReviewRequestSendAt', () => {
  const tz = 'America/New_York';

  it('schedules 10 AM local on the morning after a dinner visit', () => {
    // Wed Oct 8, 2026 8:30 PM Eastern (EDT)
    const slotEnd = new Date('2026-10-09T00:30:00.000Z');
    const now = new Date('2026-10-09T01:00:00.000Z');
    const sendAt = computeReviewRequestSendAt(slotEnd, tz, now);
    expect(isoDateInTimeZone(sendAt, tz)).toBe('2026-10-09');
    expect(hmInTimeZone(sendAt, tz)).toBe(
      `${String(REVIEW_REQUEST_PREFERRED_LOCAL_HOUR).padStart(2, '0')}:00`,
    );
  });

  it('waits until the next 10 AM when completed after preferred hour', () => {
    const slotEnd = new Date('2026-10-08T18:00:00.000Z'); // 2 PM Eastern
    const now = new Date('2026-10-09T16:00:00.000Z'); // next day 12 PM Eastern
    const sendAt = computeReviewRequestSendAt(slotEnd, tz, now);
    expect(isoDateInTimeZone(sendAt, tz)).toBe('2026-10-10');
    expect(hmInTimeZone(sendAt, tz)).toBe('10:00');
  });
});
