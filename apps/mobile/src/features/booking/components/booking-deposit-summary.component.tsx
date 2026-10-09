import { Fragment } from "react";
import { noShowFeePolicyText, prepaymentPolicyText } from "@reservations/shared";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Flex, Typography } from "@/components";

import {
  formatCents,
  type DepositBreakdown,
} from "../helpers/booking-pricing.helpers";
import { BookingSection } from "./booking-section.component";

export type BookingDepositSummaryProps = {
  breakdown: DepositBreakdown;
  cancellationPeriodHours?: number | null;
};

export function BookingDepositSummary({
  breakdown,
  cancellationPeriodHours,
}: BookingDepositSummaryProps) {
  const hasPrepayment = breakdown.grossCents > 0;
  const hasNoShowFee = breakdown.noShowFeeCents > 0;
  if (!hasPrepayment && !hasNoShowFee) return null;

  const rows: Array<{ label: string; value: string; emphasize?: boolean }> = [];
  if (breakdown.baseDepositCents > 0) {
    rows.push({
      label: "Deposit",
      value: formatCents(breakdown.baseDepositCents),
    });
  }

  if (breakdown.addOnsCents > 0) {
    rows.push({
      label: "Add-ons",
      value: formatCents(breakdown.addOnsCents),
    });
  }
  if (breakdown.pointsDiscountCents > 0) {
    rows.push({
      label: "Points",
      value: `−${formatCents(breakdown.pointsDiscountCents)}`,
    });
  }
  if (breakdown.promoDiscountCents > 0) {
    rows.push({
      label: "Promo",
      value: `−${formatCents(breakdown.promoDiscountCents)}`,
    });
  }
  if (breakdown.giftDiscountCents > 0) {
    rows.push({
      label: "Gift card",
      value: `−${formatCents(breakdown.giftDiscountCents)}`,
    });
  }

  if (hasPrepayment) {
    rows.push({
      label: "Due now",
      value: formatCents(breakdown.dueCents),
      emphasize: true,
    });
  }
  if (hasNoShowFee) {
    rows.push({
      label: "No-show fee (not charged now)",
      value: formatCents(breakdown.noShowFeeCents),
    });
  }

  return (
    <BookingSection title={hasPrepayment ? "Payment summary" : "Card guarantee"}>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.label}>
            <SummaryLine
              label={row.label}
              value={row.value}
              emphasize={row.emphasize}
            />
            {index < rows.length - 1 ? <View style={styles.divider} /> : null}
          </Fragment>
        ))}
      </View>
      {hasPrepayment ? (
        <Typography size="text-xs" color="secondary">
          {prepaymentPolicyText(cancellationPeriodHours)}
        </Typography>
      ) : null}
      {hasNoShowFee ? (
        <Typography size="text-xs" color="secondary">
          {noShowFeePolicyText(breakdown.noShowFeeCents, cancellationPeriodHours)}
        </Typography>
      ) : null}
    </BookingSection>
  );
}

function SummaryLine({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      style={styles.row}
    >
      <Typography
        size={emphasize ? "text-md" : "text-sm"}
        weight={emphasize ? "semibold" : "regular"}
        color={emphasize ? "textPrimary" : "secondary"}
      >
        {label}
      </Typography>
      <Typography
        size={emphasize ? "text-lg" : "text-sm"}
        weight={emphasize ? "bold" : "medium"}
      >
        {value}
      </Typography>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    backgroundColor: colors.slate1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate4,
    overflow: "hidden",
  },
  row: {
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate4,
  },
}));
