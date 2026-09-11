import { Modal } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { XIcon } from "@/assets";
import { Button, Flex, IconButton, Typography } from "@/components";

import {
  formatCentsAsDollars,
  formatDepositStatusLabel,
  formatReservationDate,
  needsDepositPayment,
} from "../helpers/reservation-display.helpers";

export type ReservationBillingSheetProps = {
  visible: boolean;
  onClose: () => void;
  restaurantName?: string | null;
  slotStart: string;
  depositAmountCents: number;
  depositStatus: string;
  status: string;
  slotEnd?: string | null;
  paying?: boolean;
  onPayDeposit?: () => void;
};

export function ReservationBillingSheet({
  visible,
  onClose,
  restaurantName,
  slotStart,
  depositAmountCents,
  depositStatus,
  status,
  slotEnd,
  paying = false,
  onPayDeposit,
}: ReservationBillingSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const canPay = needsDepositPayment({
    status,
    slotStart,
    slotEnd,
    depositStatus,
    depositAmountCents,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Flex
        flex={1}
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography weight="bold" size="text-xl">
            Billing
          </Typography>
          <IconButton
            icon={<XIcon />}
            onPress={onClose}
            accessibilityLabel="Close"
          />
        </Flex>

        <Typography size="text-sm" color="secondary">
          Deposit summary for this reservation.
        </Typography>

        <Flex gap={1.5} style={styles.card}>
          <Flex gap={0.25}>
            <Typography size="text-sm" color="muted">
              Restaurant
            </Typography>
            <Typography weight="semibold">
              {restaurantName ?? "Restaurant"}
            </Typography>
          </Flex>
          <Flex gap={0.25}>
            <Typography size="text-sm" color="muted">
              Visit
            </Typography>
            <Typography weight="semibold">
              {formatReservationDate(slotStart)}
            </Typography>
          </Flex>
          <Flex gap={0.25}>
            <Typography size="text-sm" color="muted">
              Deposit
            </Typography>
            <Typography weight="semibold">
              {formatCentsAsDollars(depositAmountCents)}
            </Typography>
          </Flex>
          <Flex gap={0.25}>
            <Typography size="text-sm" color="muted">
              Status
            </Typography>
            <Typography weight="semibold">
              {formatDepositStatusLabel(depositStatus)}
            </Typography>
          </Flex>
        </Flex>

        {canPay && onPayDeposit ? (
          <Button
            fullWidth
            size="xl"
            loading={paying}
            onPress={onPayDeposit}
          >
            Pay deposit
          </Button>
        ) : null}

        <Button fullWidth variant="outlined" onPress={onClose}>
          Close
        </Button>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sheet: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
    backgroundColor: colors.background,
    gap: space(2),
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.slate3,
  },
}));
