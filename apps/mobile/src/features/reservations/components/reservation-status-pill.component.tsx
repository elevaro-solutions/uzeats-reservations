import {
  displayReservationStatus,
  statusLabel,
} from "../helpers/reservation-display.helpers";

import { StatusTonePill, type StatusTone } from "./status-tone-pill.component";

export type ReservationStatusPillProps = {
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  depositStatus?: string | null;
  depositAmountCents?: number | null;
};

function toneForStatus(status: string): StatusTone {
  switch (status) {
    case "confirmed":
    case "seated":
      return "info";
    case "pending":
    case "deposit_due":
      return "warning";
    case "cancelled":
    case "no_show":
      return "error";
    case "completed":
      return "success";
    case "past":
      return "muted";
    default:
      return "primary";
  }
}

export function ReservationStatusPill({
  status,
  slotStart,
  slotEnd,
  depositStatus,
  depositAmountCents,
}: ReservationStatusPillProps) {
  const display = displayReservationStatus({
    status,
    slotStart,
    slotEnd,
    depositStatus,
    depositAmountCents,
  });

  return (
    <StatusTonePill
      label={statusLabel(display)}
      tone={toneForStatus(display)}
      capitalize
    />
  );
}
