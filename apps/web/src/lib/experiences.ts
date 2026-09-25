import {
  PLATFORM_TIMEZONE,
  formatHm12,
  formatHmRange12,
  formatUsDate,
  isoDateInTimeZone,
  minutesInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';

export type ExperienceItem = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  photoUrl?: string | null;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  ticketPriceCents: number;
  availableTickets?: number;
  minGuests?: number;
  maxGuests?: number;
  includes?: string[];
  status: string;
  tags?: string[];
};

export function experienceDateBounds(
  exp: { date: string; endDate?: string | null },
  timeZone: string = PLATFORM_TIMEZONE,
) {
  const start = isoDateInTimeZone(new Date(exp.date), timeZone);
  const end = isoDateInTimeZone(new Date(exp.endDate ?? exp.date), timeZone);
  return { start, end };
}

export function formatExperienceDateLabel(
  exp: { date: string; endDate?: string | null },
  timeZone: string = PLATFORM_TIMEZONE,
) {
  const { start, end } = experienceDateBounds(exp, timeZone);
  const startLabel = formatUsDate(zonedWallClockToUtc(start, '12:00', timeZone), {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (start === end) return startLabel;
  const endLabel = formatUsDate(zonedWallClockToUtc(end, '12:00', timeZone), {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatExperienceAvailabilityLabel(
  exp: { date: string; endDate?: string | null },
  timeZone: string = PLATFORM_TIMEZONE,
) {
  const { start, end } = experienceDateBounds(exp, timeZone);
  if (start !== end) return 'Multiple dates available';
  return formatUsDate(zonedWallClockToUtc(start, '12:00', timeZone), {
    timeZone,
    month: 'short',
    day: 'numeric',
  });
}

export function isDateInExperienceRange(
  dateStr: string,
  exp: { date: string; endDate?: string | null },
  timeZone: string = PLATFORM_TIMEZONE,
) {
  const { start, end } = experienceDateBounds(exp, timeZone);
  return dateStr >= start && dateStr <= end;
}

export function formatExperienceClock(time: string) {
  return formatHm12(time || '');
}

export function formatExperienceBookingHours(
  exp: { startTime: string; endTime: string },
  _timeZone?: string,
) {
  return formatHmRange12(exp.startTime || '', exp.endTime || '');
}

export function formatExperiencePartyLabel(exp: { minGuests?: number; maxGuests?: number }) {
  if (!exp.maxGuests) return null;
  const min = exp.minGuests ?? 1;
  if (min > 1) return `${min}–${exp.maxGuests} people`;
  return `Up to ${exp.maxGuests} people`;
}

export function minBookableExperienceParty(exp: { minGuests?: number }) {
  return Math.max(1, exp.minGuests ?? 1);
}

export function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function experienceTypeLabel(type: string) {
  return type.replace(/_/g, ' ');
}

export function truncateExperienceDescription(text: string | null | undefined, max = 140) {
  const value = text?.trim() ?? '';
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

export function isExperienceSoldOut(exp: { status: string; availableTickets?: number }) {
  return exp.status === 'sold_out' || (exp.availableTickets ?? 0) < 1;
}

export function maxBookableExperienceParty(exp: { maxGuests?: number; availableTickets?: number }) {
  const cap = Math.min(exp.maxGuests ?? 20, exp.availableTickets ?? exp.maxGuests ?? 20, 20);
  return Math.max(1, cap);
}

function hmToMinutes(hm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function isSlotInExperienceHours(
  slotIso: string,
  exp: { startTime: string; endTime: string },
  timeZone?: string,
) {
  const start = hmToMinutes(exp.startTime);
  const end = hmToMinutes(exp.endTime);
  if (start == null || end == null) return true;
  const mins = timeZone
    ? minutesInTimeZone(slotIso, timeZone)
    : new Date(slotIso).getHours() * 60 + new Date(slotIso).getMinutes();
  if (end >= start) return mins >= start && mins <= end;
  return mins >= start || mins <= end;
}
