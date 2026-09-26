import type { FloorTableStatus } from "./floor-status.helpers";

export type FloorTableState = {
  status: FloorTableStatus;
  seatedMinutes?: number | null;
  turnMinutesRemaining?: number | null;
  table: {
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string | null;
  };
  reservation?: {
    id: string;
    partySize: number;
    slotStart: string;
    status: string;
    diner?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

export type UnassignedReservation = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  diner?: { firstName?: string | null; lastName?: string | null } | null;
};

/** Raw GraphQL row before status is narrowed to FloorTableStatus. */
export type FloorTableStateRaw = Omit<FloorTableState, "status"> & {
  status: string;
};

export type FloorOpsQuery = {
  floorPlanOps: {
    date: string;
    tables: FloorTableStateRaw[];
    unassigned: UnassignedReservation[];
  };
};
