import { toast } from "sonner-native";

import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import type { AddWalkInPayload } from "./add-walk-in-schema.helpers";
import {
  waitlistActionToastCopy,
  type WaitlistAction,
} from "./waitlist-status.helpers";

type MutateFn = (options: {
  variables: Record<string, unknown>;
}) => Promise<unknown>;

type RefetchFn = () => Promise<unknown>;

export async function runWaitlistStatusAction(options: {
  id: string;
  action: WaitlistAction;
  updateStatus: MutateFn;
  refetch: RefetchFn;
  setBusyId: (id: string | null) => void;
}): Promise<void> {
  const { id, action, updateStatus, refetch, setBusyId } = options;
  if (action.action !== "status") return;
  const copy = waitlistActionToastCopy(action);
  setBusyId(id);
  try {
    await updateStatus({ variables: { id, status: action.status } });
    toast.success(copy.success);
    await refetch();
  } catch (err) {
    toast.error(copy.error, {
      description: getGraphQLErrorMessage(err, "Please try again"),
    });
  } finally {
    setBusyId(null);
  }
}

export async function runUpdateWaitlistEntry(options: {
  id: string;
  values: AddWalkInPayload;
  /** When true, clear dinerId on the entry (guest unlinked in the form). */
  clearDinerId?: boolean;
  updateEntry: MutateFn;
  refetch: RefetchFn;
  onSuccess: () => void;
}): Promise<void> {
  const { id, values, clearDinerId, updateEntry, refetch, onSuccess } = options;
  try {
    const input: Record<string, unknown> = {
      id,
      guestName: values.guestName,
      guestPhone: values.guestPhone ?? "",
      partySize: values.partySize,
      quotedWaitMinutes: values.quotedWaitMinutes ?? null,
    };
    if (clearDinerId) {
      input.dinerId = null;
    } else if (values.dinerId) {
      input.dinerId = values.dinerId;
    }
    await updateEntry({ variables: { input } });
    toast.success("Waitlist updated");
    onSuccess();
    await refetch();
  } catch (err) {
    toast.error("Couldn't update waitlist", {
      description: getGraphQLErrorMessage(err, "Please try again"),
    });
  }
}

export async function runAddWalkIn(options: {
  restaurantId: string | null | undefined;
  values: AddWalkInPayload;
  addEntry: MutateFn;
  refetch: RefetchFn;
  onSuccess: () => void;
}): Promise<void> {
  const { restaurantId, values, addEntry, refetch, onSuccess } = options;
  if (!restaurantId) {
    toast.error("Select a restaurant first");
    return;
  }
  try {
    await addEntry({
      variables: {
        input: {
          restaurantId,
          dinerId: values.dinerId,
          guestName: values.guestName,
          guestPhone: values.guestPhone,
          partySize: values.partySize,
          quotedWaitMinutes: values.quotedWaitMinutes,
        },
      },
    });
    toast.success(values.dinerId ? "Guest added" : "Walk-in added");
    onSuccess();
    await refetch();
  } catch (err) {
    toast.error("Couldn't add walk-in", {
      description: getGraphQLErrorMessage(err, "Please try again"),
    });
  }
}
