import { Fragment } from "react";
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
};

export function BookingDepositSummary({
  breakdown,
}: BookingDepositSummaryProps) {
  if (breakdown.grossCents <= 0) return null;

  const rows: Array<{ label: string; value: string; emphasize?: boolean }> = [
    {
      label: "Base deposit",
      value: formatCents(breakdown.baseDepositCents),
    },
  ];

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

  rows.push({
    label: "Hold amount",
    value: formatCents(breakdown.dueCents),
    emphasize: true,
  });

  return (
    <BookingSection title="Deposit summary">
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
      <Typography size="text-xs" color="secondary">
        Card hold — only captured if you no-show or cancel late.
      </Typography>
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
