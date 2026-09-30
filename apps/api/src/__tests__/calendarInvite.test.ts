import { describe, expect, it } from 'vitest';
import { buildIcsAttachment } from '../services/calendarInvite.js';

describe('buildIcsAttachment', () => {
  it('uses a parameter-free content type (SendGrid rejects ; in type)', () => {
    const attachment = buildIcsAttachment({
      title: 'Dinner at Demo',
      start: new Date('2026-10-01T19:00:00.000Z'),
      end: new Date('2026-10-01T21:00:00.000Z'),
      uid: 'test@tablevera.online',
    });

    expect(attachment.filename).toBe('reservation.ics');
    expect(attachment.contentType).toBe('text/calendar');
    expect(attachment.contentType).not.toMatch(/[;\r\n]/);
    expect(attachment.contentBase64.length).toBeGreaterThan(0);
  });
});
