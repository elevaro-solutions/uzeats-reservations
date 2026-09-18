import { Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button, Chip, Flex, Typography } from "@/components";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";

import {
  guestDisplayName,
  nextReservationActions,
  reservationStatusLabel,
  type ReservationAction,
} from "../helpers/reservation-status.helpers";

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
  onPress: () => void;
  onAction: (action: ReservationAction) => void;
  actionLoading?: boolean;
};

export function ReservationCard({
  reservation,
  onPress,
  onAction,
  actionLoading,
}: ReservationCardProps) {
  const actions = nextReservationActions(reservation.status);
  const tableLabel =
    reservation.tables?.map((t) => t.name).filter(Boolean).join(", ") || null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Reservation for ${guestDisplayName(reservation.diner)}`}
    >
      <Flex direction="row" justifyContent="space-between" alignItems="flex-start">
        <Flex flex={1} gap={0.5} style={styles.meta}>
          <Typography weight="semibold" size="text-lg" numberOfLines={1}>
            {guestDisplayName(reservation.diner)}
          </Typography>
          <Typography size="text-md" color="secondary">
            {formatSlotDateTime(reservation.slotStart)} · party of{" "}
            {reservation.partySize}
          </Typography>
          {tableLabel ? (
            <Typography size="text-sm" color="muted">
              Table {tableLabel}
            </Typography>
          ) : null}
        </Flex>
        <Chip size="sm" selected={false}>
          {reservationStatusLabel(reservation.status)}
        </Chip>
      </Flex>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.status}
              size="lg"
              color={
                action.tone === "error"
                  ? "error"
                  : action.tone === "warning"
                    ? "warning"
                    : action.tone === "secondary"
                      ? "secondary"
                      : "primary"
              }
              variant={action.tone === "error" || action.tone === "warning" ? "outlined" : "filled"}
              loading={actionLoading}
              onPress={() => onAction(action)}
              style={styles.actionBtn}
            >
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    gap: space(1.5),
  },
  cardPressed: {
    opacity: 0.9,
  },
  meta: {
    minWidth: 0,
    paddingRight: space(1),
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(1),
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: "30%",
  },
}));
