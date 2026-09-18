/** ICS + Google Calendar helpers for booking confirmation emails. */

function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export type CalendarInviteEvent = {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  uid?: string;
};

export function buildIcsText(event: CalendarInviteEvent): string {
  const uid = event.uid ?? `${Date.now()}@tablevera.online`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tablevera//Reservations//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function buildIcsAttachment(event: CalendarInviteEvent): {
  filename: string;
  contentBase64: string;
  contentType: string;
} {
  const ics = buildIcsText(event);
  return {
    filename: 'reservation.ics',
    contentBase64: Buffer.from(ics, 'utf8').toString('base64'),
    contentType: 'text/calendar; charset=utf-8',
  };
}

export function googleCalendarUrl(event: CalendarInviteEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatIcsDate(event.start)}/${formatIcsDate(event.end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
