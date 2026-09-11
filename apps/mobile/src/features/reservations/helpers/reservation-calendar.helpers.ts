import * as Calendar from "expo-calendar/legacy";

type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
};

export function buildReservationCalendarEvent(input: {
  restaurantName: string;
  partySize: number;
  slotStart: string | Date;
  slotEnd?: string | Date | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
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
    .join("\n");

  return {
    title: `Dinner at ${input.restaurantName}`,
    description,
    location: addressParts.join(", "),
    start,
    end,
  };
}

/**
 * Opens the system calendar UI so the guest can save the reservation
 * as a calendar event. Cancel / dismiss is not treated as an error.
 *
 * @returns `true` when the event was saved (iOS) or the dialog finished
 * (`done` on Android, where the OS does not distinguish cancel vs save).
 */
export async function addReservationToCalendar(reservation: {
  restaurant?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
    } | null;
  } | null;
  partySize: number;
  slotStart: string;
  slotEnd?: string | null;
  guestNotes?: string | null;
}): Promise<boolean> {
  const event = buildReservationCalendarEvent({
    restaurantName: reservation.restaurant?.name ?? "Restaurant",
    partySize: reservation.partySize,
    slotStart: reservation.slotStart,
    slotEnd: reservation.slotEnd,
    address: reservation.restaurant?.address,
    guestNotes: reservation.guestNotes,
  });

  const result = await Calendar.createEventInCalendarAsync({
    title: event.title,
    startDate: event.start,
    endDate: event.end,
    location: event.location || undefined,
    notes: event.description || undefined,
  });

  return (
    result.action === Calendar.CalendarDialogResultActions.saved ||
    result.action === Calendar.CalendarDialogResultActions.done
  );
}
