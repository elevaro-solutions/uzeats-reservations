import type { ReactElement } from "react";

import {
  ArmchairIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  CheckIcon,
  CircleAlertIcon,
} from "@/assets";
import type { IconPropsType } from "@/types";

import type { ReservationStatus } from "./reservation-status.helpers";

/** Icon for a reservation action, keyed by the target status. */
export function reservationActionIcon(
  status: string,
): ReactElement<IconPropsType> | undefined {
  switch (status as ReservationStatus) {
    case "confirmed":
      return <CalendarCheckIcon />;
    case "seated":
      return <ArmchairIcon />;
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
