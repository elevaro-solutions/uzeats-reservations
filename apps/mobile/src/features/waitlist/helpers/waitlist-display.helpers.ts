export type WaitlistStatusVisual = {
  label: string;
  tone: "warning" | "success" | "muted" | "error";
};

const STATUS_VISUAL: Record<string, WaitlistStatusVisual> = {
  waiting: { label: "Waiting", tone: "warning" },
  notified: { label: "Table available", tone: "success" },
  booked: { label: "Booked", tone: "success" },
  seated: { label: "Seated", tone: "success" },
  expired: { label: "Expired", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "error" },
};

export function waitlistStatusVisual(status: string): WaitlistStatusVisual {
  return STATUS_VISUAL[status] ?? { label: status, tone: "muted" };
}

export function canCancelWaitlist(status: string): boolean {
  return status === "waiting" || status === "notified";
}

export function canBookFromWaitlist(status: string): boolean {
  return status === "notified";
}
