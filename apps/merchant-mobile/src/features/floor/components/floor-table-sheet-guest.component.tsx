import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ArmchairIcon, ClockIcon, UsersIcon } from "@/assets";
import { Flex, Typography, UserAvatar } from "@/components";
import { formatSlotDateTime, guestDisplayName } from "@/lib/helpers";

import type { FloorTableState } from "../helpers/floor.types";

export type FloorTableSheetGuestProps = {
  reservation: NonNullable<FloorTableState["reservation"]>;
};

export function FloorTableSheetGuest({
  reservation,
}: FloorTableSheetGuestProps) {
  const { theme } = useUnistyles();
  const name = guestDisplayName(reservation.diner);

  return (
    <View style={styles.guestCard}>
      <Flex direction="row" alignItems="center" gap={1.5}>
        <UserAvatar
          firstName={reservation.diner?.firstName ?? undefined}
          lastName={reservation.diner?.lastName ?? undefined}
          size="md"
          variant="subtle"
        />
        <Flex flex={1} gap={0.5} style={styles.guestCopy}>
          <Typography weight="semibold" size="text-lg" numberOfLines={2}>
            {name}
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
                {reservation.partySize}{" "}
                {reservation.partySize === 1 ? "guest" : "guests"}
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
              <Typography size="text-sm" color="muted" numberOfLines={1}>
                {formatSlotDateTime(reservation.slotStart)}
              </Typography>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </View>
  );
}

export type FloorTableSheetSeatPromptProps = {
  seatGuestName: string;
};

export function FloorTableSheetSeatPrompt({
  seatGuestName,
}: FloorTableSheetSeatPromptProps) {
  const { theme } = useUnistyles();

  return (
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
  );
}

export function FloorTableSheetEmptyGuest() {
  return (
    <View style={styles.emptyCard}>
      <Typography size="text-sm" color="secondary">
        Select an arriving guest on the Floor list, then Seat here.
      </Typography>
    </View>
  );
}

/** Renders guest card, seat prompt, or empty state for the table sheet. */
export function FloorTableSheetGuestSection({
  reservation,
  seatGuestName,
  status,
}: {
  reservation?: FloorTableState["reservation"];
  seatGuestName?: string | null;
  status: string;
}) {
  if (reservation) {
    return <FloorTableSheetGuest reservation={reservation} />;
  }
  if (seatGuestName && status !== "seated") {
    return <FloorTableSheetSeatPrompt seatGuestName={seatGuestName} />;
  }
  return <FloorTableSheetEmptyGuest />;
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  guestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    backgroundColor: colors.slate1,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
}));
