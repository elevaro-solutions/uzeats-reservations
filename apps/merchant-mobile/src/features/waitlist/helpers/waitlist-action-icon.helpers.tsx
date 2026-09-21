import type { ReactElement } from "react";

import { ArmchairIcon, BellIcon, XIcon } from "@/assets";
import type { IconPropsType } from "@/types";

import type { WaitlistStatus } from "./waitlist-status.helpers";

/** Icon for a waitlist action, keyed by the target status. */
export function waitlistActionIcon(
  status: string,
): ReactElement<IconPropsType> | undefined {
  switch (status as WaitlistStatus) {
    case "notified":
      return <BellIcon />;
    case "seated":
      return <ArmchairIcon />;
    case "cancelled":
      return <XIcon />;
    default:
      return undefined;
  }
}
