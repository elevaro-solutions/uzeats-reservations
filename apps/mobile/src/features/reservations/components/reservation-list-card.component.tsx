import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CalendarIcon, ClockIcon, UserIcon } from "@/assets";
import { Flex, RemoteImage, Typography } from "@/components";

import {
  formatReservationDate,
  formatReservationTime,
  needsDepositPayment,
} from "../helpers/reservation-display.helpers";
import { ReservationStatusPill } from "./reservation-status-pill.component";

export type ReservationListCardItem = {
  id: string;
  status: string;
  slotStart: string;
  slotEnd?: string | null;
  partySize: number;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  restaurant?: {
    id?: string;
    name?: string;
    photos?: (string | null)[] | null;
    address?: {
      city?: string | null;
      neighborhood?: string | null;
      line1?: string | null;
    } | null;
  } | null;
};

export type ReservationListCardProps = {
  item: ReservationListCardItem;
  onPress: () => void;
};

export function ReservationListCard({ item, onPress }: ReservationListCardProps) {
  const { theme } = useUnistyles();
  const photo = item.restaurant?.photos?.find(Boolean);
  const addressLabel =
    item.restaurant?.address?.neighborhood ||
    item.restaurant?.address?.city ||
    item.restaurant?.address?.line1 ||
    null;
  const depositDue = needsDepositPayment(item);
  const muted = theme.colors.textMuted;

  return (
    <View style={styles.shadow}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[
          item.restaurant?.name,
          formatReservationDate(item.slotStart),
          formatReservationTime(item.slotStart, item.slotEnd),
          `${item.partySize} guests`,
        ]
          .filter(Boolean)
          .join(", ")}
      >
        <Flex gap={1.5}>
          <Flex direction="row" gap={1.5} alignItems="center">
            {photo ? (
              <RemoteImage
                uri={photo}
                style={styles.thumb}
                recyclingKey={item.id}
              />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}
            <Flex gap={0.25} style={styles.headerText}>
              <Typography weight="semibold" numberOfLines={1}>
                {item.restaurant?.name ?? "Restaurant"}
              </Typography>
              {addressLabel ? (
                <Typography size="text-sm" color="muted" numberOfLines={1}>
                  {addressLabel}
                </Typography>
              ) : null}
            </Flex>
            <ReservationStatusPill
              status={item.status}
              slotStart={item.slotStart}
              slotEnd={item.slotEnd}
              depositStatus={item.depositStatus}
              depositAmountCents={item.depositAmountCents}
            />
          </Flex>

          <View style={styles.metaWell}>
            <Flex
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Flex direction="row" alignItems="center" gap={0.5}>
                <CalendarIcon size={14} color={muted} />
                <Typography size="text-xs" weight="medium" color="secondary">
                  {formatReservationDate(item.slotStart)}
                </Typography>
              </Flex>
              <Flex direction="row" alignItems="center" gap={0.5}>
                <ClockIcon size={14} color={muted} />
                <Typography size="text-xs" weight="medium" color="secondary">
                  {formatReservationTime(item.slotStart, item.slotEnd)}
                </Typography>
              </Flex>
              <Flex direction="row" alignItems="center" gap={0.5}>
                <UserIcon size={14} color={muted} />
                <Typography size="text-xs" weight="medium" color="secondary">
                  {item.partySize}
                </Typography>
              </Flex>
            </Flex>
          </View>

          {depositDue ? (
            <View style={styles.depositCue}>
              <Typography size="text-xs" weight="medium" color="warning">
                Deposit due · $
                {((item.depositAmountCents ?? 0) / 100).toFixed(2)}
              </Typography>
            </View>
          ) : null}
        </Flex>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  shadow: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    shadowColor: colors.slate12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: space(1.5),
  },
  card: {
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    width: space(6),
    height: space(6),
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  metaWell: {
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  depositCue: {
    alignSelf: "flex-start",
    paddingHorizontal: space(1),
    paddingVertical: space(0.5),
    borderRadius: radius.sm,
    backgroundColor: colors.warningSubtle,
  },
}));
