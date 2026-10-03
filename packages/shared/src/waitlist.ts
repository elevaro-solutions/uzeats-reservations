import {
  WAITLIST_DEFAULT_OVERDUE_MINUTES,
  WAITLIST_PREFERRED_WINDOW_MINUTES,
  WAITLIST_STATUSES,
} from "./constants.js";
import { hmInTimeZone } from "./timezone.js";
import type { WaitlistStatus } from "./types.js";

export type WaitlistPreferredWindow = {
  preferredTimeStart: string;
  preferredTimeEnd: string;
};

function padHm(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseHmToMinutes(hm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Build a preferred-time window from an HH:mm start (defaults to +2h). */
export function preferredWindowFromHm(
  startHm: string,
  windowMinutes = WAITLIST_PREFERRED_WINDOW_MINUTES,
): WaitlistPreferredWindow | null {
  const start = parseHmToMinutes(startHm);
  if (start == null) return null;
  return {
    preferredTimeStart: padHm(start),
    preferredTimeEnd: padHm(start + windowMinutes),
  };
}

/** Build a preferred-time window from a slot instant in the venue timezone. */
export function preferredWindowFromSlot(
  slot: Date | string,
  timeZone: string,
  windowMinutes = WAITLIST_PREFERRED_WINDOW_MINUTES,
): WaitlistPreferredWindow | null {
  const date = typeof slot === "string" ? new Date(slot) : slot;
  if (Number.isNaN(date.getTime())) return null;
  return preferredWindowFromHm(hmInTimeZone(date, timeZone), windowMinutes);
}

const TERMINAL: ReadonlySet<string> = new Set([
  "booked",
  "seated",
  "expired",
  "cancelled",
]);

/** Partner-driven status transitions (system may also set booked/expired). */
const PARTNER_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  waiting: new Set(["notified", "seated", "cancelled"]),
  notified: new Set(["seated", "cancelled"]),
};

export function isWaitlistStatus(value: string): value is WaitlistStatus {
  return (WAITLIST_STATUSES as readonly string[]).includes(value);
}

export function isTerminalWaitlistStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export function canPartnerTransitionWaitlist(
  from: string,
  to: string,
): boolean {
  return PARTNER_TRANSITIONS[from]?.has(to) ?? false;
}

const ACTIVE_WAIT_STATUSES = new Set(["waiting", "notified"]);

export function isActiveWaitlistWaitStatus(status: string): boolean {
  return ACTIVE_WAIT_STATUSES.has(status);
}

/** Elapsed minutes since the party joined the waitlist. */
export function waitlistWaitingMinutes(
  createdAt: Date | string | number,
  now: Date = new Date(),
): number {
  const start =
    typeof createdAt === "string" || typeof createdAt === "number"
      ? new Date(createdAt)
      : createdAt;
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60_000));
}

/**
 * Promised wait used for overdue checks: quoted first, then ETA estimate,
 * else the platform default.
 */
export function waitlistPromisedMinutes(input: {
  quotedWaitMinutes?: number | null;
  estimatedWaitMinutes?: number | null;
  defaultMinutes?: number;
}): number {
  if (input.quotedWaitMinutes != null && input.quotedWaitMinutes > 0) {
    return input.quotedWaitMinutes;
  }
  if (input.estimatedWaitMinutes != null && input.estimatedWaitMinutes > 0) {
    return input.estimatedWaitMinutes;
  }
  return input.defaultMinutes ?? WAITLIST_DEFAULT_OVERDUE_MINUTES;
}

export function isWaitlistWaitOverdue(input: {
  status: string;
  waitingMinutes: number;
  quotedWaitMinutes?: number | null;
  estimatedWaitMinutes?: number | null;
  defaultMinutes?: number;
}): boolean {
  if (!isActiveWaitlistWaitStatus(input.status)) return false;
  const promised = waitlistPromisedMinutes(input);
  return input.waitingMinutes > promised;
}

/** Compact label: `12 min`, `1h 05m`. */
export function formatWaitlistWaitingLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${String(rem).padStart(2, "0")}m`;
}
