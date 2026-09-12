import { Fragment, type ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  BottomSheet,
  Button,
  Flex,
  InlineAlert,
  Typography,
} from "@/components";

import {
  depositStatusTone,
  formatCentsAsDollars,
  formatDepositStatusLabel,
  formatReservationDate,
  needsDepositPayment,
} from "../helpers/reservation-display.helpers";

import { StatusTonePill } from "./status-tone-pill.component";

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
  const canPay = needsDepositPayment({
    status,
    slotStart,
    slotEnd,
    depositStatus,
    depositAmountCents,
  });

  const showHoldAlert =
    depositStatus === "requires_payment" || depositStatus === "authorized";

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Billing"
      description="Deposit summary for this reservation."
      headerBorder
      loading={paying}
      accessibilityLabel="Close billing"
      footer={
        canPay && onPayDeposit ? (
          <Button
            fullWidth
            size="xl"
            loading={paying}
            onPress={onPayDeposit}
          >
            Pay deposit
          </Button>
        ) : undefined
      }
    >
      <Flex alignItems="center" gap={1} style={styles.hero}>
        <Typography size="display-xs" weight="bold">
          {formatCentsAsDollars(depositAmountCents)}
        </Typography>
        <Typography size="text-sm" color="secondary">
          Deposit hold
        </Typography>
        <StatusTonePill
          label={formatDepositStatusLabel(depositStatus)}
          tone={depositStatusTone(depositStatus)}
        />
      </Flex>

      <View style={styles.summaryCard}>
        <SummaryRow label="Restaurant">
          <Typography size="text-sm" weight="medium" style={styles.valueText}>
            {restaurantName ?? "Restaurant"}
          </Typography>
        </SummaryRow>
        <SummaryRow label="Visit" last>
          <Typography size="text-sm" weight="medium" style={styles.valueText}>
            {formatReservationDate(slotStart)}
          </Typography>
        </SummaryRow>
      </View>

      {showHoldAlert ? (
        <InlineAlert
          tone="info"
          message="Card hold — only captured if you no-show or cancel late."
        />
      ) : null}
    </BottomSheet>
  );
}

function SummaryRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <Fragment>
      <Flex
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1.5}
        style={styles.summaryRow}
      >
        <Typography size="text-sm" color="secondary" style={styles.label}>
          {label}
        </Typography>
        <View style={styles.value}>{children}</View>
      </Flex>
      {last ? null : <View style={styles.divider} />}
    </Fragment>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  hero: {
    paddingTop: space(0.5),
    paddingBottom: space(0.5),
  },
  summaryCard: {
    backgroundColor: colors.slate1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate4,
    overflow: "hidden",
  },
  summaryRow: {
    paddingVertical: space(2),
    paddingHorizontal: space(2),
  },
  label: {
    paddingTop: space(0.25),
    flexShrink: 0,
  },
  value: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0,
  },
  valueText: {
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate4,
  },
}));
