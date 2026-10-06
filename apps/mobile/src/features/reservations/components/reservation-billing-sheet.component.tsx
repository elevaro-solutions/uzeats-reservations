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
  noShowFeePolicyText,
  PLATFORM_TIMEZONE,
  prepaymentPolicyText,
} from "@reservations/shared";

import {
  depositStatusTone,
  formatCardGuaranteeLabel,
  formatCentsAsDollars,
  formatDepositStatusLabel,
  formatReservationDate,
  needsDepositPayment,
  paymentDueActionLabel,
} from "../helpers/reservation-display.helpers";

import { StatusTonePill } from "./status-tone-pill.component";

export type ReservationBillingSheetProps = {
  visible: boolean;
  onClose: () => void;
  restaurantName?: string | null;
  slotStart: string;
  depositAmountCents: number;
  depositStatus: string;
  noShowFeeCents?: number;
  cardGuaranteeStatus?: string | null;
  status: string;
  slotEnd?: string | null;
  timeZone?: string | null;
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
  noShowFeeCents = 0,
  cardGuaranteeStatus,
  status,
  slotEnd,
  timeZone,
  paying = false,
  onPayDeposit,
}: ReservationBillingSheetProps) {
  const timing = {
    status,
    slotStart,
    slotEnd,
    depositStatus,
    depositAmountCents,
    noShowFeeCents,
    cardGuaranteeStatus,
  };
  const canPay = needsDepositPayment(timing);
  const hasPrepayment = depositAmountCents > 0;
  const showGuaranteeNote =
    noShowFeeCents > 0 &&
    (cardGuaranteeStatus === "requires_card" || cardGuaranteeStatus === "card_saved");
  const visitTimeZone = timeZone ?? PLATFORM_TIMEZONE;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Billing"
      description="Payments for this reservation."
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
            {paymentDueActionLabel(timing)}
          </Button>
        ) : undefined
      }
    >
      <Flex alignItems="center" gap={1} style={styles.hero}>
        <Typography size="display-xs" weight="bold">
          {formatCentsAsDollars(hasPrepayment ? depositAmountCents : noShowFeeCents)}
        </Typography>
        <Typography size="text-sm" color="secondary">
          {hasPrepayment ? "Paid at booking" : "No-show fee"}
        </Typography>
        <StatusTonePill
          label={
            hasPrepayment
              ? formatDepositStatusLabel(depositStatus)
              : formatCardGuaranteeLabel(cardGuaranteeStatus)
          }
          tone={
            hasPrepayment
              ? depositStatusTone(depositStatus)
              : cardGuaranteeStatus === "charged" || cardGuaranteeStatus === "failed"
                ? "warning"
                : "muted"
          }
        />
      </Flex>

      <View style={styles.summaryCard}>
        <SummaryRow label="Restaurant">
          <Typography size="text-sm" weight="medium" style={styles.valueText}>
            {restaurantName ?? "Restaurant"}
          </Typography>
        </SummaryRow>
        <SummaryRow label="Visit" last={!(hasPrepayment && noShowFeeCents > 0)}>
          <Typography size="text-sm" weight="medium" style={styles.valueText}>
            {formatReservationDate(slotStart, visitTimeZone)}
          </Typography>
        </SummaryRow>
        {hasPrepayment && noShowFeeCents > 0 ? (
          <SummaryRow label="No-show fee" last>
            <Typography size="text-sm" weight="medium" style={styles.valueText}>
              {`${formatCentsAsDollars(noShowFeeCents)} · ${formatCardGuaranteeLabel(cardGuaranteeStatus)}`}
            </Typography>
          </SummaryRow>
        ) : null}
      </View>

      {depositStatus === "requires_payment" ? (
        <InlineAlert tone="info" message={prepaymentPolicyText()} />
      ) : null}
      {showGuaranteeNote ? (
        <InlineAlert tone="info" message={noShowFeePolicyText(noShowFeeCents)} />
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
