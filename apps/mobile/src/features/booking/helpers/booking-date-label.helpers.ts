import { formatRelativeDayLabel } from "@/lib/helpers/date-time.helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

export function formatQuickDateLabel(
  iso: string,
  timeZone: string = PLATFORM_TIMEZONE,
): string {
  return formatRelativeDayLabel(iso, timeZone);
}
