export type ShiftHoursInput = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  active?: boolean;
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
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  return days.map((d) => short[d]!).join(", ");
}
