import type { ApolloError, ApolloQueryResult } from "@apollo/client";
import { useCallback, useState } from "react";
import { toast } from "sonner-native";

import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import type { FloorOpsQuery, FloorTableState } from "./floor.types";

type SeatMutation = (options: {
  variables: { reservationId: string; tableId: string };
}) => Promise<unknown>;

type StatusMutation = (options: {
  variables: { id: string; status: string };
}) => Promise<unknown>;

type Refetch = () => Promise<ApolloQueryResult<FloorOpsQuery>>;

export function useFloorOpsActions({
  selected,
  selectedUnassignedId,
  seatAtTable,
  updateStatus,
  refetch,
  onClearSelection,
}: {
  selected: FloorTableState | null;
  selectedUnassignedId: string | null;
  seatAtTable: SeatMutation;
  updateStatus: StatusMutation;
  refetch: Refetch;
  onClearSelection: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const seatHere = useCallback(async () => {
    if (!selected) return;
    const reservationId =
      selected.reservation?.id ?? selectedUnassignedId ?? null;
    if (!reservationId) {
      toast.error("Select an arriving party first");
      return;
    }
    setBusy(true);
    try {
      await seatAtTable({
        variables: { reservationId, tableId: selected.table.id },
      });
      toast.success("Guest seated");
      onClearSelection();
      await refetch();
    } catch (err) {
      toast.error("Couldn't seat guest", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
  }, [
    onClearSelection,
    refetch,
    seatAtTable,
    selected,
    selectedUnassignedId,
  ]);

  const changeStatus = useCallback(
    async (status: string) => {
      const reservationId = selected?.reservation?.id;
      if (!reservationId) return;
      const STATUS_TOAST_LABELS: Record<string, string> = {
        completed: "complete",
        no_show: "no-show",
        cancelled: "cancel",
      };
      const statusLabel = STATUS_TOAST_LABELS[status] ?? status;
      setBusy(true);
      try {
        await updateStatus({ variables: { id: reservationId, status } });
        toast.success(`Marked ${statusLabel}`);
        onClearSelection();
        await refetch();
      } catch (err) {
        toast.error("Couldn't update status", {
          description: getGraphQLErrorMessage(err, "Please try again"),
        });
      } finally {
        setBusy(false);
      }
    },
    [onClearSelection, refetch, selected?.reservation?.id, updateStatus],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { busy, refreshing, seatHere, changeStatus, onRefresh };
}

export type FloorLoadError = ApolloError | Error | undefined;
