export type WaitlistStatus =
  | "waiting"
  | "notified"
  | "seated"
  | "cancelled"
  | "expired"
  | "booked";

export type WaitlistActionTone = "primary" | "error" | "secondary";

export type WaitlistAction = {
  label: string;
  status: WaitlistStatus;
  tone?: WaitlistActionTone;
  kind: "primary" | "secondary";
};

export type WaitlistStatusThemeColors = {
  amber3: string;
  amber11: string;
  blue3: string;
  blue11: string;
  green3: string;
  green11: string;
  slate3: string;
  slate4: string;
  slate9: string;
  slate11: string;
};

export type WaitlistStatusVisual = {
  label: string;
  chipBg: string;
  chipText: string;
};

export type WaitlistMetric = {
  primary: string;
  secondary: string;
};

const STATUS_LABELS: Record<WaitlistStatus, string> = {
  waiting: "Waiting",
  notified: "Notified",
  seated: "Seated",
  cancelled: "Cancelled",
  expired: "Expired",
  booked: "Booked",
};

const TERMINAL_STATUSES = new Set<string>([
  "seated",
  "cancelled",
  "expired",
  "booked",
]);

export function isTerminalWaitlistStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function waitlistStatusLabel(status: string): string {
  return STATUS_LABELS[status as WaitlistStatus] ?? status;
}

export type WaitlistActionToastCopy = {
  success: string;
  error: string;
};

/** Outcome-oriented toast copy keyed by the action's target status. */
export function waitlistActionToastCopy(
  action: Pick<WaitlistAction, "status">,
): WaitlistActionToastCopy {
  switch (action.status) {
    case "notified":
      return {
        success: "Guest notified",
        error: "Couldn't notify guest",
      };
    case "seated":
      return {
        success: "Guest seated",
        error: "Couldn't seat guest",
      };
    case "cancelled":
      return {
        success: "Removed from waitlist",
        error: "Couldn't remove guest",
      };
    default:
      return {
        success: `Marked ${waitlistStatusLabel(action.status).toLowerCase()}`,
        error: "Couldn't update waitlist",
      };
  }
}

/**
 * Waitlist lifecycle palette (mirrors reservation list chips):
 * waiting → amber, notified → blue, seated → green,
 * cancelled/expired/booked → slate.
 */
export function waitlistStatusVisual(
  status: string,
  colors: WaitlistStatusThemeColors,
): WaitlistStatusVisual {
  switch (status) {
    case "waiting":
      return {
        label: STATUS_LABELS.waiting,
        chipBg: colors.amber3,
        chipText: colors.amber11,
      };
    case "notified":
      return {
        label: STATUS_LABELS.notified,
        chipBg: colors.blue3,
        chipText: colors.blue11,
      };
    case "seated":
      return {
        label: STATUS_LABELS.seated,
        chipBg: colors.green3,
        chipText: colors.green11,
      };
    case "cancelled":
      return {
        label: STATUS_LABELS.cancelled,
        chipBg: colors.slate3,
        chipText: colors.slate9,
      };
    case "expired":
    case "booked":
    default:
      return {
        label: STATUS_LABELS[status as WaitlistStatus] ?? status,
        chipBg: colors.slate4,
        chipText: colors.slate11,
      };
  }
}

export function nextWaitlistActions(status: string): WaitlistAction[] {
  switch (status) {
    case "waiting":
      return [
        { label: "Notify", status: "notified", tone: "primary", kind: "primary" },
        { label: "Seat", status: "seated", tone: "secondary", kind: "secondary" },
        { label: "Remove", status: "cancelled", tone: "error", kind: "secondary" },
      ];
    case "notified":
      return [
        { label: "Seat", status: "seated", tone: "primary", kind: "primary" },
        { label: "Remove", status: "cancelled", tone: "error", kind: "secondary" },
      ];
    default:
      return [];
  }
}

export function primaryWaitlistAction(status: string): WaitlistAction | null {
  return nextWaitlistActions(status).find((a) => a.kind === "primary") ?? null;
}

export function secondaryWaitlistActions(status: string): WaitlistAction[] {
  return nextWaitlistActions(status).filter((a) => a.kind === "secondary");
}

import { guestDisplayName } from "@/lib/helpers";

export type WaitlistEntryNameSource = {
  guestName?: string | null;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export function entryDisplayName(entry: WaitlistEntryNameSource): string {
  if (entry.guestName?.trim()) return entry.guestName.trim();
  return guestDisplayName(entry.diner);
}

export type WaitlistEntryPhoneSource = {
  guestPhone?: string | null;
  diner?: { phone?: string | null } | null;
};

export function entryPhone(entry: WaitlistEntryPhoneSource): string | null {
  const phone = entry.guestPhone?.trim() || entry.diner?.phone?.trim();
  return phone || null;
}

export type WaitlistEntryMetricSource = {
  status: string;
  partySize: number;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
  quotedWaitMinutes?: number | null;
};

/** Prefer estimated wait; fall back to quoted. */
export function waitMinutesValue(
  entry: Pick<
    WaitlistEntryMetricSource,
    "estimatedWaitMinutes" | "quotedWaitMinutes"
  >,
): number | null {
  if (entry.estimatedWaitMinutes != null) return entry.estimatedWaitMinutes;
  if (entry.quotedWaitMinutes != null) return entry.quotedWaitMinutes;
  return null;
}

export function waitMinutesLabel(
  entry: Pick<
    WaitlistEntryMetricSource,
    "estimatedWaitMinutes" | "quotedWaitMinutes"
  >,
): string | null {
  const minutes = waitMinutesValue(entry);
  if (minutes == null) return null;
  if (entry.estimatedWaitMinutes != null) return `~${minutes} min`;
  return `quoted ${minutes} min`;
}

/**
 * Leading metric block: queue # when waiting + position, else wait minutes,
 * else party size.
 */
export function waitlistMetric(entry: WaitlistEntryMetricSource): WaitlistMetric {
  if (entry.status === "waiting" && entry.position != null) {
    return { primary: `#${entry.position}`, secondary: "queue" };
  }

  const minutes = waitMinutesValue(entry);
  if (minutes != null) {
    return { primary: `~${minutes}`, secondary: "min" };
  }

  return { primary: String(entry.partySize), secondary: "ppl" };
}
