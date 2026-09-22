import { useMemo, type ReactElement, type ReactNode } from "react";
import { Alert, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  ArmchairIcon,
  CalendarXIcon,
  CheckIcon,
  CircleAlertIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from "@/assets";
import {
  BottomSheet,
  Button,
  Flex,
  Typography,
  UserAvatar,
} from "@/components";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";
import { renderIcon } from "@/lib/helpers";
import type { IconPropsType } from "@/types";

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

type FloorTableAction = {
  label: string;
  status: string;
  tone?: "primary" | "error" | "secondary" | "warning";
};

function guestName(
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
): string {
  return (
    [diner?.firstName, diner?.lastName].filter(Boolean).join(" ") || "Guest"
  );
}

function capacityLabel(table: FloorTableSheetState["table"]): string {
  if (table.minCapacity === table.maxCapacity) {
    return `${table.maxCapacity} seats`;
  }
  return `${table.minCapacity}–${table.maxCapacity} seats`;
}

/** Human-readable duration for floor timing metrics. */
function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.floor(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function floorActionIcon(
  status: string,
): ReactElement<IconPropsType> | undefined {
  switch (status) {
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

  const secondaryActions = useMemo((): FloorTableAction[] => {
    if (!hasReservation) return [];
    const actions: FloorTableAction[] = [];
    if (canSeat) {
      actions.push({
        label: "Complete",
        status: "completed",
        tone: "primary",
      });
    }
    actions.push(
      {
        label: "No-show",
        status: "no_show",
        tone: "warning",
      },
      {
        label: "Cancel",
        status: "cancelled",
        tone: "error",
      },
    );
    return actions;
  }, [canSeat, hasReservation]);

  const primaryLabel = canSeat
    ? "Seat here"
    : hasReservation && isOccupied
      ? "Complete"
      : null;
  const primaryStatus = canSeat ? "seat" : "completed";

  const reservationGuest = selected?.reservation
    ? guestName(selected.reservation.diner)
    : null;

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

  const showSeatedMetric = selected?.seatedMinutes != null;
  const showTurnMetric = selected?.turnMinutesRemaining != null;
  const turnEmphasized = selected?.status === "turning";

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

          {selected.reservation ? (
            <View style={styles.guestCard}>
              <Flex direction="row" alignItems="center" gap={1.5}>
                <UserAvatar
                  firstName={
                    selected.reservation.diner?.firstName ?? undefined
                  }
                  lastName={selected.reservation.diner?.lastName ?? undefined}
                  size="md"
                  variant="subtle"
                />
                <Flex flex={1} gap={0.5} style={styles.guestCopy}>
                  <Typography
                    weight="semibold"
                    size="text-lg"
                    numberOfLines={2}
                  >
                    {reservationGuest}
                  </Typography>
                  <Flex
                    direction="row"
                    alignItems="center"
                    gap={1}
                    style={styles.metaWrap}
                  >
                    <Flex direction="row" alignItems="center" gap={0.5}>
                      <UsersIcon size={14} color={theme.colors.textMuted} />
                      <Typography size="text-sm" color="muted">
                        {selected.reservation.partySize}{" "}
                        {selected.reservation.partySize === 1
                          ? "guest"
                          : "guests"}
                      </Typography>
                    </Flex>
                    <Typography size="text-sm" color="muted">
                      ·
                    </Typography>
                    <Flex
                      direction="row"
                      alignItems="center"
                      gap={0.5}
                      style={styles.metaShrink}
                    >
                      <ClockIcon size={14} color={theme.colors.textMuted} />
                      <Typography
                        size="text-sm"
                        color="muted"
                        numberOfLines={1}
                      >
                        {formatSlotDateTime(selected.reservation.slotStart)}
                      </Typography>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
            </View>
          ) : seatGuestName && selected.status !== "seated" ? (
            <View style={styles.seatPrompt}>
              <Flex direction="row" alignItems="center" gap={1.5}>
                <View style={styles.seatIconWell}>
                  <ArmchairIcon size={20} color={theme.colors.primary} />
                </View>
                <Flex flex={1} gap={0.25}>
                  <Typography weight="semibold" size="text-md">
                    Seat {seatGuestName} here
                  </Typography>
                  <Typography size="text-sm" color="secondary">
                    Arriving party selected from the unassigned list
                  </Typography>
                </Flex>
              </Flex>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Typography size="text-sm" color="secondary">
                Select an arriving guest on the Floor list, then Seat here.
              </Typography>
            </View>
          )}

          {showSeatedMetric || showTurnMetric ? (
            <Flex gap={1}>
              <Typography
                size="text-xs"
                weight="semibold"
                color="muted"
                style={styles.sectionTitle}
              >
                Timing
              </Typography>
              <Flex direction="row" gap={1.5}>
                {showSeatedMetric ? (
                  <View
                    style={[
                      styles.metricChip,
                      turnEmphasized && styles.metricChipMuted,
                    ]}
                  >
                    <Flex
                      direction="row"
                      alignItems="center"
                      gap={0.5}
                      style={styles.metricLabelRow}
                    >
                      <ClockIcon size={14} color={theme.colors.textMuted} />
                      <Typography size="text-xs" color="muted" weight="medium">
                        Time seated
                      </Typography>
                    </Flex>
                    <Typography weight="bold" size="text-xl">
                      {formatMinutes(selected.seatedMinutes ?? 0)}
                    </Typography>
                    <Typography size="text-xs" color="muted">
                      since check-in
                    </Typography>
                  </View>
                ) : null}
                {showTurnMetric ? (
                  <View
                    style={[
                      styles.metricChip,
                      turnEmphasized && styles.metricChipEmphasis,
                    ]}
                  >
                    <Flex
                      direction="row"
                      alignItems="center"
                      gap={0.5}
                      style={styles.metricLabelRow}
                    >
                      <ClockIcon
                        size={14}
                        color={
                          turnEmphasized
                            ? visual.accent
                            : theme.colors.textMuted
                        }
                      />
                      <Typography
                        size="text-xs"
                        weight="medium"
                        style={
                          turnEmphasized
                            ? { color: visual.accent }
                            : undefined
                        }
                        color={turnEmphasized ? undefined : "muted"}
                      >
                        Until turn
                      </Typography>
                    </Flex>
                    <Typography
                      weight="bold"
                      size="text-xl"
                      style={
                        turnEmphasized ? { color: visual.accent } : undefined
                      }
                    >
                      {formatMinutes(selected.turnMinutesRemaining ?? 0)}
                    </Typography>
                    <Typography
                      size="text-xs"
                      color={turnEmphasized ? undefined : "muted"}
                      style={
                        turnEmphasized ? { color: visual.accent } : undefined
                      }
                    >
                      {turnEmphasized
                        ? "Table clearing soon"
                        : "of dining window"}
                    </Typography>
                  </View>
                ) : null}
              </Flex>
            </Flex>
          ) : null}

          <Flex gap={1}>
            <Typography
              size="text-xs"
              weight="semibold"
              color="muted"
              style={styles.sectionTitle}
            >
              Table
            </Typography>
            <View style={styles.factsCard}>
              <FactRow
                icon={<UsersIcon size={16} color={theme.colors.textMuted} />}
                label="Capacity"
                value={capacityLabel(selected.table)}
                isLast={!selected.table.floorArea}
              />
              {selected.table.floorArea ? (
                <FactRow
                  icon={
                    <MapPinIcon size={16} color={theme.colors.textMuted} />
                  }
                  label="Area"
                  value={selected.table.floorArea}
                  isLast
                />
              ) : null}
            </View>
          </Flex>

          {secondaryActions.length > 0 ? (
            <Flex gap={1}>
              <Typography
                size="text-xs"
                weight="semibold"
                color="muted"
                style={styles.sectionTitle}
              >
                Actions
              </Typography>
              <View style={styles.actionsList}>
                {secondaryActions.map((action) => {
                  const danger = action.tone === "error";
                  const color = danger
                    ? theme.colors.error
                    : theme.colors.textPrimary;
                  const icon = floorActionIcon(action.status);

                  return (
                    <Pressable
                      key={action.status}
                      disabled={busy}
                      onPress={() => handleSecondaryAction(action)}
                      style={({ pressed }) => [
                        styles.actionRow,
                        pressed && styles.actionRowPressed,
                        busy && styles.actionRowDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                    >
                      {icon
                        ? renderIcon({
                            icon,
                            color,
                            style: styles.actionIcon,
                          })
                        : null}
                      <Typography
                        weight="medium"
                        color={danger ? "error" : "textPrimary"}
                      >
                        {action.label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </Flex>
          ) : null}
        </Flex>
      ) : null}
    </BottomSheet>
  );
}

function FactRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      gap={1.5}
      style={[styles.factRow, !isLast && styles.factRowBorder]}
    >
      <View style={styles.iconWell}>{icon}</View>
      <Flex flex={1} gap={0.25} style={styles.factCopy}>
        <Typography size="text-xs" color="muted">
          {label}
        </Typography>
        <Typography size="text-md" weight="medium" numberOfLines={2}>
          {value}
        </Typography>
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  guestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.white,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  guestCopy: {
    minWidth: 0,
  },
  metaWrap: {
    flexWrap: "wrap",
    minWidth: 0,
  },
  metaShrink: {
    minWidth: 0,
    flexShrink: 1,
  },
  seatPrompt: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary1,
    borderWidth: 1,
    borderColor: colors.primary3,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  seatIconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.slate1,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  metricChip: {
    flex: 1,
    gap: space(0.5),
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate3,
  },
  metricLabelRow: {
    minWidth: 0,
  },
  metricChipMuted: {
    opacity: 0.85,
  },
  metricChipEmphasis: {
    backgroundColor: colors.blue1,
    borderColor: colors.blue4,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
  factsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  factRow: {
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
  },
  factRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  iconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  factCopy: {
    minWidth: 0,
  },
  actionsList: {
    borderRadius: radius.lg,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate2,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
  },
  actionRowPressed: {
    backgroundColor: colors.slate2,
  },
  actionRowDisabled: {
    opacity: 0.6,
  },
  actionIcon: {
    width: 22,
    height: 22,
  },
}));
