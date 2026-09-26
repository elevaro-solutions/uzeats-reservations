import type { ReactElement } from "react";

import {
  StatusActionsSheet,
  type StatusActionItem,
} from "@/components";
import type { IconPropsType } from "@/types";

import { waitlistActionIcon } from "../helpers/waitlist-action-icon.helpers";
import type { WaitlistAction } from "../helpers/waitlist-status.helpers";

export type WaitlistActionsSheetProps = {
  visible: boolean;
  guestName: string;
  actions: WaitlistAction[];
  loading?: boolean;
  onClose: () => void;
  onAction: (action: WaitlistAction) => void;
};

export function WaitlistActionsSheet({
  visible,
  guestName,
  actions,
  loading,
  onClose,
  onAction,
}: WaitlistActionsSheetProps) {
  const items: StatusActionItem[] = actions.map((action) => ({
    key: action.status,
    label: action.label,
    tone: action.tone,
    icon: waitlistActionIcon(action.status) as ReactElement<IconPropsType>,
  }));

  return (
    <StatusActionsSheet
      visible={visible}
      description={guestName}
      actions={items}
      loading={loading}
      onClose={onClose}
      onAction={(item) => {
        const action = actions.find((a) => a.status === item.key);
        if (action) onAction(action);
      }}
    />
  );
}
