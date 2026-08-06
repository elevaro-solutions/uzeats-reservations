type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
};

function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildReservationCalendarEvent(input: {
  restaurantName: string;
  partySize: number;
  slotStart: string | Date;
  slotEnd?: string | Date | null;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  guestNotes?: string | null;
}): CalendarEventInput {
  const start = new Date(input.slotStart);
  const end = input.slotEnd
    ? new Date(input.slotEnd)
    : new Date(start.getTime() + 90 * 60_000);

  const addressParts = [
    input.address?.line1,
    input.address?.city,
    input.address?.state,
    input.address?.zip,
  ].filter(Boolean);

  const description = [
    `Party of ${input.partySize}`,
    input.guestNotes ? `Notes: ${input.guestNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: `Dinner at ${input.restaurantName}`,
    description,
    location: addressParts.join(', '),
    start,
    end,
  };
}

export function downloadIcsFile(event: CalendarEventInput, filename = 'reservation.ics') {
  const uid = `${Date.now()}@tablevera`;
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

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function addReservationToCalendar(reservation: {
  restaurant?: {
    name?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  } | null;
  partySize: number;
  slotStart: string;
  slotEnd?: string | null;
  guestNotes?: string | null;
}) {
  const event = buildReservationCalendarEvent({
    restaurantName: reservation.restaurant?.name ?? 'Restaurant',
    partySize: reservation.partySize,
    slotStart: reservation.slotStart,
    slotEnd: reservation.slotEnd,
    address: reservation.restaurant?.address,
    guestNotes: reservation.guestNotes,
  });
  const safeName = (reservation.restaurant?.name ?? 'reservation')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  downloadIcsFile(event, `${safeName || 'reservation'}.ics`);
}
