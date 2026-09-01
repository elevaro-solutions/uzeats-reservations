const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  const weekday = WEEKDAY[date.getDay()];
  const month = MONTH[date.getMonth()];
  return `${weekday}, ${month} ${date.getDate()}`;
}

export function parseTime24(time: string): { hours: number; minutes: number } | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hours: h, minutes: m };
}

export function toTime24(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDisplayTime(time?: string): string {
  if (!time) return "Any time";
  const parsed = parseTime24(time);
  if (!parsed) return time;
  const { hours, minutes } = parsed;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  if (minutes === 0) return `${hour12}:00 ${period}`;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function timeToDate(time: string): Date {
  const parsed = parseTime24(time);
  const date = new Date();
  if (parsed) {
    date.setHours(parsed.hours, parsed.minutes, 0, 0);
  }
  return date;
}

export const TIME_PRESETS = [
  { label: "Any time", value: undefined },
  { label: "5:00 PM", value: "17:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "7:00 PM", value: "19:00" },
  { label: "8:00 PM", value: "20:00" },
] as const;

export const DISTANCE_PRESETS_KM = [1, 5, 10, 25, 50] as const;
