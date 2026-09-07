import { formatRelativeDayLabel } from "@/lib/helpers/date-time.helpers";

export function formatQuickDateLabel(iso: string): string {
  return formatRelativeDayLabel(iso);
}
