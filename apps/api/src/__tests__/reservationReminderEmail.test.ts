import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../models/EmailTemplate.js';
import { renderEmailTemplateContent } from '../services/emailTemplates.js';
import { renderDefaultReservationReminderEmail } from '../services/reminderEmail.js';

const BOOKING_TEMPLATE_KEYS = [
  'booking_confirmation',
  'booking_pending',
  'booking_updated',
  'booking_reminder',
  'booking_reminder_late',
  'booking_cancelled',
  'deposit_refunded',
  'no_show_fee_charged',
  'no_show_fee_refunded',
] as const;

describe('reservation reminder email templates', () => {
  const previousWebUrl = env.WEB_APP_URL;

  afterEach(() => {
    (env as { WEB_APP_URL: string }).WEB_APP_URL = previousWebUrl;
  });

  it('renders the running-late template with action buttons and a reservation link', () => {
    (env as { WEB_APP_URL: string }).WEB_APP_URL = 'https://tablevera.online';
    const email = renderDefaultReservationReminderEmail({
      firstName: 'Alex',
      restaurantName: 'Diyor Choyxona 30',
      when: 'Oct 5, 2026, 6:45 PM EDT',
      partySize: 2,
      reservationId: 'res-1',
      askLate: true,
    });

    const reservationUrl = 'https://tablevera.online/reservations/res-1';
    const lateUrl = `${reservationUrl}?runningLate=1`;

    expect(email.subject).toBe('Are you running late for Diyor Choyxona 30?');
    expect(email.reservationUrl).toBe(reservationUrl);
    expect(email.htmlBody).toContain("I'm running late");
    expect(email.htmlBody).toContain("I'm on time");
    expect(email.htmlBody).toContain(lateUrl);
    expect(email.htmlBody).toContain(reservationUrl);
    expect(email.emailText).toContain(`I'm running late: ${lateUrl}`);
    expect(email.emailText).toContain(`Reservation: ${reservationUrl}`);
  });

  it('renders the 24-hour template with a view-reservation button and link', () => {
    (env as { WEB_APP_URL: string }).WEB_APP_URL = 'https://tablevera.online/';
    const email = renderDefaultReservationReminderEmail({
      firstName: '',
      restaurantName: 'Cedar & Salt',
      when: 'Oct 7, 2026, 7:00 PM EDT',
      partySize: 1,
      reservationId: 'res-2',
      askLate: false,
    });

    expect(email.subject).toBe('Reminder: Cedar & Salt');
    expect(email.htmlBody).toContain('Hi there,');
    expect(email.htmlBody).toContain('View reservation');
    expect(email.htmlBody).not.toContain("I'm running late");
    expect(email.reservationUrl).toBe('https://tablevera.online/reservations/res-2');
    expect(email.emailText).toContain('1 guest');
    expect(email.emailText).toContain('View reservation: https://tablevera.online/reservations/res-2');
  });

  it('gives every booking template a reservation link button', () => {
    const reservationUrl = 'https://tablevera.online/reservations/preview';
    for (const key of BOOKING_TEMPLATE_KEYS) {
      const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === key);
      expect(template, key).toBeTruthy();
      const rendered = renderEmailTemplateContent(template!, {
        reservationUrl,
        calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
        lateUrl: `${reservationUrl}?runningLate=1`,
        firstName: 'Alex',
        restaurantName: 'Cedar & Salt',
        date: 'Oct 7, 2026, 7:00 PM EDT',
        partySize: '2 guests',
        detailBox: '',
        messageSection: '',
        amount: '$25.00',
        feeLabel: 'no-show',
        feeTitle: 'No-show fee charged',
        note: '.',
      });
      expect(rendered.bodyHtml, key).toContain(reservationUrl);
      expect(rendered.bodyHtml, key).toContain('href=');
      expect(rendered.bodyText, key).toContain(reservationUrl);
    }
  });
});
