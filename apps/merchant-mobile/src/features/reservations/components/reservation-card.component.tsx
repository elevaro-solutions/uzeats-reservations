import { useState } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ArmchairIcon, MoreHorizontalIcon, UsersIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";
import {
  formatSlotDateTime,
  formatSlotTimeParts,
} from "@/lib/helpers/date-time.helpers";

import {
  guestDisplayName,
  primaryReservationAction,
  reservationStatusVisual,
  secondaryReservationActions,
  type ReservationAction,
} from "../helpers/reservation-status.helpers";
import { reservationActionIcon } from "../helpers/reservation-action-icon.helpers";
import { ReservationActionsSheet } from "./reservation-actions-sheet.component";

export type ReservationListItem = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  diner?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  tables?: Array<{ id: string; name: string }> | null;
};

export type ReservationCardProps = {
  reservation: ReservationListItem;
  timeZone?: string;
  onPress: () => void;
  onAction: (action: ReservationAction) => void;
  actionLoading?: boolean;
};

export function ReservationCard({
  reservation,
  timeZone,
  onPress,
  onAction,
  actionLoading,
}: ReservationCardProps) {
  const { theme } = useUnistyles();
  const [sheetOpen, setSheetOpen] = useState(false);

  const primary = primaryReservationAction(reservation.status);
  const secondary = secondaryReservationActions(reservation.status);
  const visual = reservationStatusVisual(reservation.status, theme.colors);
  const guestName = guestDisplayName(reservation.diner);
  const timeLabel = formatSlotDateTime(reservation.slotStart, timeZone);
  const { time, period } = formatSlotTimeParts(reservation.slotStart, timeZone);
  const tableLabel =
    reservation.tables
      ?.map((t) => t.name)
      .filter(Boolean)
      .join(", ") || null;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${timeLabel}, ${
          tableLabel ? `Table ${tableLabel}` : "Unassigned"
        }, party of ${reservation.partySize}, ${guestName}, ${visual.label}`}
      >
        <View style={[styles.statusPill, { backgroundColor: visual.chipBg }]}>
          <Typography
            weight="semibold"
            size="text-xs"
            style={{ color: visual.chipText }}
            numberOfLines={1}
          >
            {visual.label}
          </Typography>
        </View>

        <Flex direction="row" alignItems="center" gap={1.5}>
          <View style={styles.timeBlock}>
            <Typography weight="semibold" size="text-xl" numberOfLines={1}>
              {time}
            </Typography>
            <Typography weight="medium" size="text-xs" color="muted">
              {period}
            </Typography>
          </View>

          <Flex flex={1} direction="column" gap={0.5} style={styles.details}>
            <Typography weight="semibold" size="text-md" numberOfLines={1}>
              {guestName}
            </Typography>

            <Flex
              direction="row"
              alignItems="center"
              gap={1}
              style={styles.meta}
            >
              <Flex direction="row" alignItems="center" gap={0.5}>
                <UsersIcon size={14} color={theme.colors.textMuted} />
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {reservation.partySize} guests
                </Typography>
              </Flex>
              <Typography size="text-sm" color="muted">
                ·
              </Typography>
              <Flex
                direction="row"
                alignItems="center"
                gap={0.5}
                style={styles.meta}
              >
                <ArmchairIcon size={14} color={theme.colors.textMuted} />
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {tableLabel ? `Table ${tableLabel}` : "Unassigned"}
                </Typography>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        {primary || secondary.length > 0 ? (
          <View style={styles.actions} onStartShouldSetResponder={() => true}>
            <Flex direction="row" alignItems="center" gap={1}>
              {primary ? (
                <View style={styles.primaryBtn}>
                  <Button
                    size="md"
                    color="secondary"
                    fullWidth
                    loading={actionLoading}
                    startIcon={reservationActionIcon(primary.status)}
                    onPress={() => onAction(primary)}
                  >
                    {primary.label}
                  </Button>
                </View>
              ) : null}
              {secondary.length > 0 ? (
                <IconButton
                  icon={<MoreHorizontalIcon />}
                  variant="surface"
                  size="md"
                  disabled={actionLoading}
                  onPress={() => setSheetOpen(true)}
                  accessibilityLabel="More actions"
                  style={styles.moreBtn}
                />
              ) : null}
            </Flex>
          </View>
        ) : null}
      </Pressable>

      <ReservationActionsSheet
        visible={sheetOpen}
        guestName={guestName}
        actions={secondary}
        loading={actionLoading}
        onClose={() => setSheetOpen(false)}
        onAction={(action) => {
          setSheetOpen(false);
          onAction(action);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    position: "relative",
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate3,
    gap: space(1.5),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  statusPill: {
    position: "absolute",
    top: space(1.25),
    right: space(1.25),
    borderRadius: radius.full,
    paddingHorizontal: space(1),
    paddingVertical: space(0.25),
    zIndex: 1,
  },
  timeBlock: {
    width: space(8),
    height: space(8),
    borderRadius: radius.md,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  details: {
    minWidth: 0,
    paddingRight: space(7.5),
  },
  meta: {
    minWidth: 0,
    flexShrink: 1,
  },
  actions: {
    marginTop: space(0.25),
  },
  primaryBtn: {
    flex: 1,
  },
  moreBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate5,
    backgroundColor: colors.white,
  },
}));
