/** Convert Tablevera shift days (0=Sun … 6=Sat) into schema.org OpeningHoursSpecification. */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type ShiftHoursInput = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active?: boolean;
};

export type OpeningHoursSpec = {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string;
  opens: string;
  closes: string;
};

/** Human-readable lines like "Mon–Fri 11:00–22:00". */
export function formatOpeningHoursLines(shifts: ShiftHoursInput[]): string[] {
  const active = shifts.filter((s) => s.active !== false);
  if (!active.length) return [];

  const lines: string[] = [];
  for (const shift of active) {
    const days = [...new Set(shift.daysOfWeek)]
      .filter((d) => d >= 0 && d <= 6)
      .sort((a, b) => a - b);
    if (!days.length) continue;
    const dayLabel = formatDayRange(days);
    lines.push(`${dayLabel} ${shift.startTime}–${shift.endTime}`);
  }
  return lines;
}

function formatDayRange(days: number[]): string {
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 1) return short[days[0]!]!;

  let contiguous = true;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] !== days[i - 1]! + 1) {
      contiguous = false;
      break;
    }
  }
  if (contiguous) {
    return `${short[days[0]!]!}–${short[days[days.length - 1]!]!}`;
  }
  return days.map((d) => short[d]!).join(', ');
}

export function openingHoursSpecificationFromShifts(
  shifts: ShiftHoursInput[],
): OpeningHoursSpec[] {
  const specs: OpeningHoursSpec[] = [];
  for (const shift of shifts.filter((s) => s.active !== false)) {
    for (const day of [...new Set(shift.daysOfWeek)].sort((a, b) => a - b)) {
      if (day < 0 || day > 6) continue;
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAY_NAMES[day]!,
        opens: shift.startTime,
        closes: shift.endTime,
      });
    }
  }
  return specs;
}
