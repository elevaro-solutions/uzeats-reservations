export const HOME_LIST_LIMIT = 4;
export const HOME_LIST_LIMIT_TABLET = 6;
export const HOME_CUISINES_LIMIT = 12;
export const HOME_UPCOMING_BOOKINGS_LIMIT = 8;

export function homeListLimit(columns: number): number {
  return columns > 1 ? HOME_LIST_LIMIT_TABLET : HOME_LIST_LIMIT;
}
