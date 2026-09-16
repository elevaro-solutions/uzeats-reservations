/** Convert Tablevera shift days (0=Sun … 6=Sat) into schema.org OpeningHoursSpecification. */

import type { ShiftHoursInput } from '@reservations/shared';

export {
  formatOpeningHoursLines,
  type ShiftHoursInput,
} from '@reservations/shared';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type OpeningHoursSpec = {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string;
  opens: string;
  closes: string;
};

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
