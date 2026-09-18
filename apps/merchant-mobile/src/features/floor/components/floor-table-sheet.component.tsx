import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BottomSheet, Button, Flex, Typography } from "@/components";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";

import {
  floorStatusLabel,
  floorStatusVisual,
} from "../helpers/floor-status.helpers";

export type FloorTableSheetState = {
  status: string;
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

export type FloorTableSheetProps = {
  visible: boolean;
  selected: FloorTableSheetState | null;
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

  const canSeat =
    Boolean(selected) &&
    selected?.status !== "seated" &&
    Boolean(selected?.reservation || seatGuestName);

  const capacityLabel = selected
    ? selected.table.minCapacity === selected.table.maxCapacity
      ? `${selected.table.maxCapacity} seats`
      : `${selected.table.minCapacity}–${selected.table.maxCapacity} seats`
    : "";

  const showSeat = canSeat;
  const showReservationActions = Boolean(selected?.reservation);
  const hasActions = showSeat || showReservationActions;

  const footer =
    selected && hasActions ? (
      <Flex gap={1.5}>
        {showSeat ? (
          <Button fullWidth size="xl" loading={busy} onPress={onSeatHere}>
            Seat here
          </Button>
        ) : null}
        {showReservationActions ? (
          <>
            <Button
              fullWidth
              size="xl"
              loading={busy}
              onPress={() => onChangeStatus("completed")}
            >
              Complete
            </Button>
            <Button
              fullWidth
              size="xl"
              color="warning"
              variant="outlined"
              loading={busy}
              onPress={() => onChangeStatus("no_show")}
            >
              No-show
            </Button>
            <Button
              fullWidth
              size="xl"
              color="error"
              variant="outlined"
              loading={busy}
              onPress={() => onChangeStatus("cancelled")}
            >
              Cancel
            </Button>
          </>
        ) : null}
      </Flex>
    ) : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={selected ? `Table ${selected.table.name}` : "Table"}
      showHandle
      headerBorder
      footer={footer}
    >
      {selected && visual ? (
        <Flex gap={2.5}>
          <Flex
            direction="row"
            alignItems="center"
            gap={1}
            style={styles.metaRow}
          >
            <View
              style={[styles.statusChip, { backgroundColor: visual.chipBg }]}
            >
              <Typography
                size="text-xs"
                weight="semibold"
                style={{ color: visual.chipText }}
              >
                {floorStatusLabel(selected.status)}
              </Typography>
            </View>
            <Typography size="text-sm" color="secondary">
              {capacityLabel}
            </Typography>
            {selected.table.floorArea ? (
              <Typography size="text-sm" color="muted">
                · {selected.table.floorArea}
              </Typography>
            ) : null}
          </Flex>

          {selected.reservation ? (
            <View style={styles.block}>
              <Typography weight="semibold" size="text-md">
                {[
                  selected.reservation.diner?.firstName,
                  selected.reservation.diner?.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "Guest"}
              </Typography>
              <Typography size="text-sm" color="secondary">
                Party of {selected.reservation.partySize} ·{" "}
                {formatSlotDateTime(selected.reservation.slotStart)}
              </Typography>
              {selected.seatedMinutes != null ? (
                <Typography size="text-sm" color="muted">
                  {selected.seatedMinutes}m seated
                </Typography>
              ) : null}
              {selected.turnMinutesRemaining != null ? (
                <Typography size="text-sm" color="muted">
                  {selected.turnMinutesRemaining}m turn remaining
                </Typography>
              ) : null}
            </View>
          ) : seatGuestName && selected.status !== "seated" ? (
            <View style={styles.prompt}>
              <Typography size="text-md">
                Seat {seatGuestName} here
              </Typography>
            </View>
          ) : (
            <Typography size="text-sm" color="secondary">
              No reservation on this table.
            </Typography>
          )}
        </Flex>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  metaRow: {
    flexWrap: "wrap",
    rowGap: space(1),
  },
  statusChip: {
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.75),
    borderRadius: radius.full,
  },
  block: {
    gap: space(0.75),
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
  },
  prompt: {
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
  },
}));
