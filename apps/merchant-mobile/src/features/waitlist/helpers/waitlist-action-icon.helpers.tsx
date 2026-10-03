import type { ReactElement } from "react";

import { ArmchairIcon, BellIcon, PencilIcon, XIcon } from "@/assets";
import type { IconPropsType } from "@/types";

/** Icon for a waitlist action, keyed by the target status or sheet key. */
export function waitlistActionIcon(
  status: string,
): ReactElement<IconPropsType> | undefined {
  switch (status) {
    case "edit":
      return <PencilIcon />;
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
