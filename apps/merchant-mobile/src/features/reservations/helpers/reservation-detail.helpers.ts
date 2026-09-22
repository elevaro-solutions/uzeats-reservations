import { Linking } from "react-native";
import { toast } from "sonner-native";

import { formatPhoneDisplay } from "@/lib/helpers";

import type { AssignTableOption } from "../components/assign-table-sheet.component";
import type { ReservationDetailRow } from "../components/reservation-detail-section.component";
import type { ReservationAction } from "./reservation-status.helpers";
import { reservationOccasionLabel } from "./reservation-occasion.helpers";

export type ReservationRow = {
  id: string;
  restaurantId: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string | null;
  status: string;
  occasion?: string | null;
  guestNotes?: string | null;
  source?: string | null;
  diner?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  tables?: Array<{ id: string; name: string }> | null;
  tableIds?: string[] | null;
};

export const ACTIONABLE_STATUSES = new Set(["pending", "confirmed", "seated"]);

export function needsConfirmation(action: ReservationAction): boolean {
  return action.status === "cancelled" || action.status === "no_show";
}

export async function openContactUrl(
  url: string,
  kind: "phone" | "email",
): Promise<void> {
  const label = kind === "phone" ? "phone" : "email";
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      toast.error(`Couldn't open ${label}`, {
        description:
          kind === "phone"
            ? "No phone app is available on this device."
            : "No mail app is available on this device.",
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    toast.error(`Couldn't open ${label}`, {
      description: "Please try again.",
    });
  }
}

export type GuestRowCallbacks = {
  onPhonePress: (phone: string) => void;
  onEmailPress: (email: string) => void;
};

export function buildGuestRows(
  reservation: ReservationRow,
  callbacks: GuestRowCallbacks,
): ReservationDetailRow[] {
  if (!reservation.diner) return [];
  const rows: ReservationDetailRow[] = [];
  const phone = reservation.diner.phone?.trim();
  const email = reservation.diner.email?.trim();

  if (phone) {
    rows.push({
      key: "phone",
      label: "Phone",
      value: formatPhoneDisplay(phone) || phone,
      onPress: () => {
        callbacks.onPhonePress(phone);
      },
      accessibilityLabel: `Call ${phone}`,
    });
  }
  if (email) {
    rows.push({
      key: "email",
      label: "Email",
      value: email,
      onPress: () => {
        callbacks.onEmailPress(email);
      },
      accessibilityLabel: `Email ${email}`,
    });
  }
  return rows;
}

export function buildBookingRows(
  reservation: ReservationRow,
): ReservationDetailRow[] {
  const rows: ReservationDetailRow[] = [];
  if (reservation.source) {
    rows.push({
      key: "source",
      label: "Source",
      value: reservation.source,
    });
  }
  const occasion = reservationOccasionLabel(reservation.occasion);
  if (occasion) {
    rows.push({
      key: "occasion",
      label: "Occasion",
      value: occasion,
    });
  }
  if (reservation.guestNotes) {
    rows.push({
      key: "notes",
      label: "Notes",
      value: reservation.guestNotes,
    });
  }
  return rows;
}

export function buildAssignTableOptions(args: {
  restaurantTables: Array<{ id: string; name: string; active?: boolean | null }>;
  bookableTables: Array<{
    id: string;
    name: string;
    minCapacity?: number;
    maxCapacity?: number;
  }>;
  assignedTables?: Array<{ id: string; name: string }> | null;
}): AssignTableOption[] {
  const byId = new Map<string, AssignTableOption>();
  for (const t of args.restaurantTables.filter((row) => row.active !== false)) {
    byId.set(t.id, { id: t.id, name: t.name });
  }
  for (const t of args.bookableTables) {
    byId.set(t.id, {
      id: t.id,
      name: t.name,
      minCapacity: t.minCapacity,
      maxCapacity: t.maxCapacity,
    });
  }
  for (const t of args.assignedTables ?? []) {
    const existing = byId.get(t.id);
    byId.set(t.id, existing ? { ...existing, name: t.name } : t);
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function reservationTableLabel(
  tables?: Array<{ name: string }> | null,
): string | null {
  const label = tables
    ?.map((t) => t.name)
    .filter(Boolean)
    .join(", ");
  return label || null;
}
