import type { ReactElement } from "react";

import {
  StatusActionsSheet,
  type StatusActionItem,
} from "@/components";
import type { IconPropsType } from "@/types";

import { reservationActionIcon } from "../helpers/reservation-action-icon.helpers";
import type { ReservationAction } from "../helpers/reservation-status.helpers";

export type ReservationActionsSheetProps = {
  visible: boolean;
  guestName: string;
  actions: ReservationAction[];
  loading?: boolean;
  onClose: () => void;
  onAction: (action: ReservationAction) => void;
};

export function ReservationActionsSheet({
  visible,
  guestName,
  actions,
  loading,
  onClose,
  onAction,
}: ReservationActionsSheetProps) {
  const items: StatusActionItem[] = actions.map((action) => ({
    key: action.status,
    label: action.label,
    tone: action.tone,
    icon: reservationActionIcon(action.status) as ReactElement<IconPropsType>,
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
