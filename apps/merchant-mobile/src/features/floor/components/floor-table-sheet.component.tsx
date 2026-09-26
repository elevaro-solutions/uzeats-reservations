import { useMemo } from "react";
import { Alert, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ArmchairIcon, CheckIcon } from "@/assets";
import {
  BottomSheet,
  Button,
  Flex,
  StatusActionsList,
  Typography,
} from "@/components";

import {
  floorStatusLabel,
  floorStatusVisual,
} from "../helpers/floor-status.helpers";
import {
  buildFloorSecondaryActions,
  toFloorStatusActionItems,
  type FloorTableAction,
} from "../helpers/floor-table-sheet.helpers";
import type { FloorTableState } from "../helpers/floor.types";
import { FloorTableSheetFacts } from "./floor-table-sheet-facts.component";
import { FloorTableSheetGuestSection } from "./floor-table-sheet-guest.component";
import { FloorTableSheetTiming } from "./floor-table-sheet-timing.component";

export type FloorTableSheetProps = {
  visible: boolean;
  selected: FloorTableState | null;
  seatGuestName?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSeatHere: () => void;
  onChangeStatus: (status: string) => void;
};

export function FloorTableSheet({
  visible,
  selected,
  seatGuestName,
  busy = false,
  onClose,
  onSeatHere,
  onChangeStatus,
}: FloorTableSheetProps) {
  const { theme } = useUnistyles();

  const visual = selected
    ? floorStatusVisual(selected.status, theme.colors)
    : null;

  const status = selected?.status;
  const hasReservation = Boolean(selected?.reservation);
  const isOccupied = status === "seated" || status === "turning";

  const canSeat =
    Boolean(selected) &&
    !isOccupied &&
    Boolean(selected?.reservation || seatGuestName);

  const secondaryActions = useMemo(
    () => buildFloorSecondaryActions(hasReservation, canSeat),
    [canSeat, hasReservation],
  );

  const actionItems = useMemo(
    () => toFloorStatusActionItems(secondaryActions),
    [secondaryActions],
  );

  const primaryLabel = canSeat
    ? "Seat here"
    : hasReservation && isOccupied
      ? "Complete"
      : null;
  const primaryStatus = canSeat ? "seat" : "completed";

  function handleSecondaryAction(action: FloorTableAction) {
    if (action.status === "no_show" || action.status === "cancelled") {
      const title =
        action.status === "no_show"
          ? "Mark as no-show?"
          : "Cancel reservation?";
      const message =
        action.status === "no_show"
          ? "This guest will be marked as a no-show. You can’t undo this from the app."
          : "This reservation will be cancelled. You can’t undo this from the app.";
      Alert.alert(title, message, [
        { text: "Keep reservation", style: "cancel" },
        {
          text: action.label,
          style: "destructive",
          onPress: () => onChangeStatus(action.status),
        },
      ]);
      return;
    }
    onChangeStatus(action.status);
  }

  function handlePrimary() {
    if (canSeat) {
      onSeatHere();
      return;
    }
    if (hasReservation) {
      onChangeStatus("completed");
    }
  }

  const footer =
    selected && primaryLabel ? (
      <Button
        fullWidth
        size="xl"
        loading={busy}
        startIcon={
          primaryStatus === "seat" ? <ArmchairIcon /> : <CheckIcon />
        }
        onPress={handlePrimary}
      >
        {primaryLabel}
      </Button>
    ) : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={selected ? `Table ${selected.table.name}` : "Table"}
      showHandle
      headerBorder
      scrollable
      footer={footer}
      loading={busy}
    >
      {selected && visual ? (
        <Flex gap={2.5}>
          <Flex gap={1}>
            <Typography
              size="text-xs"
              weight="semibold"
              color="muted"
              style={styles.sectionTitle}
            >
              Status
            </Typography>
            <View
              style={[styles.statusPill, { backgroundColor: visual.chipBg }]}
            >
              <Typography
                size="text-md"
                weight="semibold"
                style={{ color: visual.chipText }}
              >
                {floorStatusLabel(selected.status)}
              </Typography>
            </View>
          </Flex>

          <FloorTableSheetGuestSection
            reservation={selected.reservation}
            seatGuestName={seatGuestName}
            status={selected.status}
          />

          <FloorTableSheetTiming
            seatedMinutes={selected.seatedMinutes}
            turnMinutesRemaining={selected.turnMinutesRemaining}
            turnEmphasized={selected.status === "turning"}
            visual={visual}
          />

          <FloorTableSheetFacts table={selected.table} />

          {actionItems.length > 0 ? (
            <StatusActionsList
              actions={actionItems}
              loading={busy}
              onAction={(item) => {
                const action = secondaryActions.find(
                  (a) => a.status === item.key,
                );
                if (action) handleSecondaryAction(action);
              }}
            />
          ) : null}
        </Flex>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
}));
