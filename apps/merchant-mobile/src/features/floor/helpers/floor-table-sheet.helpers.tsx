import type { ReactElement } from "react";

import {
  CalendarXIcon,
  CheckIcon,
  CircleAlertIcon,
} from "@/assets";
import type { StatusActionItem } from "@/components";
import type { IconPropsType } from "@/types";

import type { FloorTableState } from "./floor.types";

export type FloorTableAction = {
  label: string;
  status: string;
  tone?: "primary" | "error" | "secondary" | "warning";
};

export function capacityLabel(table: FloorTableState["table"]): string {
  if (table.minCapacity === table.maxCapacity) {
    return `${table.maxCapacity} seats`;
  }
  return `${table.minCapacity}–${table.maxCapacity} seats`;
}

/** Human-readable duration for floor timing metrics. */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.floor(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function floorActionIcon(
  status: string,
): ReactElement<IconPropsType> | undefined {
  switch (status) {
    case "completed":
      return <CheckIcon />;
    case "cancelled":
      return <CalendarXIcon />;
    case "no_show":
      return <CircleAlertIcon />;
    default:
      return undefined;
  }
}

export function buildFloorSecondaryActions(
  hasReservation: boolean,
  canSeat: boolean,
): FloorTableAction[] {
  if (!hasReservation) return [];
  const actions: FloorTableAction[] = [];
  if (canSeat) {
    actions.push({
      label: "Complete",
      status: "completed",
      tone: "primary",
    });
  }
  actions.push(
    {
      label: "No-show",
      status: "no_show",
      tone: "warning",
    },
    {
      label: "Cancel",
      status: "cancelled",
      tone: "error",
    },
  );
  return actions;
}

export function toFloorStatusActionItems(
  actions: FloorTableAction[],
): StatusActionItem[] {
  return actions.map((action) => ({
    key: action.status,
    label: action.label,
    tone: action.tone,
    icon: floorActionIcon(action.status),
  }));
}
