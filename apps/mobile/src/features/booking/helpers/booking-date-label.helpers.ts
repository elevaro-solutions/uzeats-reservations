import { formatDisplayDate } from "@/lib/helpers/date-time.helpers";

import { todayIsoDate, tomorrowIsoDate } from "./time-slots.helpers";

export function formatQuickDateLabel(iso: string): string {
  if (iso === todayIsoDate()) return "Today";
  if (iso === tomorrowIsoDate()) return "Tomorrow";
  return formatDisplayDate(iso);
}
