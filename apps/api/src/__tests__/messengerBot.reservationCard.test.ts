import { describe, expect, it } from 'vitest';
import { renderReservationCardMessage } from '../services/messengerBot/reservationCard.js';

const baseCard = {
  reservationId: 'a'.repeat(24),
  restaurantId: 'b'.repeat(24),
  status: 'confirmed',
  guestName: 'Jane Doe',
  partySize: 4,
  // 7:00 PM in New York / 4:00 PM in Los Angeles / 00:00 UTC next day
  slotStart: new Date('2026-11-06T00:00:00.000Z'),
};

describe('messengerBot reservation card', () => {
  it('renders the slot in the restaurant timezone, not the server clock', () => {
    const ny = renderReservationCardMessage(
      { ...baseCard, timeZone: 'America/New_York' },
      { profile: 'FOH' },
    );
    expect(ny.text).toContain('Nov 5, 2026, 7:00 PM EST');

    const la = renderReservationCardMessage(
      { ...baseCard, timeZone: 'America/Los_Angeles' },
      { profile: 'FOH' },
    );
    expect(la.text).toContain('Nov 5, 2026, 4:00 PM PST');
  });
});
