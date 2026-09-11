import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { LOYALTY, RESTAURANT_LOYALTY } from "@reservations/shared";

import { BottomSheet, Flex, Typography } from "@/components";

export type BookingLoyaltyInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
  variant: "platform" | "restaurant";
  minRedeem: number;
};

type RuleItem = {
  value?: string;
  detail: string;
};

export function BookingLoyaltyInfoSheet({
  visible,
  onClose,
  variant,
  minRedeem,
}: BookingLoyaltyInfoSheetProps) {
  const isPlatform = variant === "platform";
  const title = isPlatform ? "Tablevera points" : "Restaurant points";
  const redeemPerDollar = isPlatform
    ? LOYALTY.REDEEM_POINTS_PER_DOLLAR
    : RESTAURANT_LOYALTY.REDEEM_POINTS_PER_DOLLAR;

  const earnItems: RuleItem[] = isPlatform
    ? [
        {
          value: `${LOYALTY.POINTS_PER_COMPLETED_VISIT} pts`,
          detail: "per completed visit",
        },
        {
          value: `${LOYALTY.POINTS_PER_DOLLAR_DEPOSIT} pt`,
          detail: "per $1 deposit authorized",
        },
        {
          value: `${LOYALTY.POINTS_PER_REVIEW} pts`,
          detail: "for leaving a review",
        },
        {
          value: `${LOYALTY.FIRST_BOOKING_BONUS_POINTS} pts`,
          detail: "first-booking bonus",
        },
      ]
    : [
        {
          value: `About ${RESTAURANT_LOYALTY.DEFAULT_POINTS_PER_VISIT} pts`,
          detail: "per visit at this restaurant (set by the restaurant)",
        },
        {
          detail: "Earned separately from Tablevera platform points",
        },
      ];

  const redeemItems: RuleItem[] = [
    {
      value: `${redeemPerDollar} pts`,
      detail: "= $1 off your deposit hold",
    },
    {
      value: `${minRedeem.toLocaleString()} pts`,
      detail: "minimum to redeem",
    },
    {
      detail: "Applied on this booking before you authorize the deposit",
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`How ${title.toLowerCase()} work`}
      description="Earn, redeem, and save on deposits"
      showHandle
      headerBorder
      scrollable
      accessibilityLabel="Close how points work"
      contentContainerStyle={styles.body}
    >
      <RuleSection title="Earn" items={earnItems} />
      <RuleSection title="Redeem" items={redeemItems} />
      {isPlatform ? (
        <RuleSection
          title="Expiry"
          items={[
            {
              detail: `Points expire after ${LOYALTY.POINTS_EXPIRY_MONTHS} months of inactivity`,
            },
          ]}
        />
      ) : null}

      <View style={styles.noteBlock}>
        <Typography size="text-sm" weight="semibold">
          On this booking
        </Typography>
        <Typography size="text-sm" color="secondary">
          Choose an amount on the card to reduce the deposit due. The remainder
          is authorized as a card hold — only captured if you no-show or cancel
          late.
        </Typography>
      </View>
    </BottomSheet>
  );
}

function RuleSection({
  title,
  items,
}: {
  title: string;
  items: RuleItem[];
}) {
  return (
    <Flex gap={1.25}>
      <Typography size="text-md" weight="semibold">
        {title}
      </Typography>
      <Flex gap={1.25}>
        {items.map((item) => (
          <Flex
            key={`${item.value ?? ""}-${item.detail}`}
            direction="row"
            gap={1.25}
            style={styles.ruleRow}
          >
            <View style={styles.bullet} />
            <View style={styles.ruleText}>
              {item.value ? (
                <Typography size="text-sm" color="secondary">
                  <Typography size="text-sm" weight="semibold">
                    {item.value}
                  </Typography>{" "}
                  {item.detail}
                </Typography>
              ) : (
                <Typography size="text-sm" color="secondary">
                  {item.detail}
                </Typography>
              )}
            </View>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  body: {
    gap: space(3),
  },
  ruleRow: {
    alignItems: "flex-start",
  },
  bullet: {
    width: space(0.75),
    height: space(0.75),
    borderRadius: radius.full,
    backgroundColor: colors.slate8,
    marginTop: space(0.75),
  },
  ruleText: {
    flex: 1,
  },
  noteBlock: {
    gap: space(0.75),
    paddingTop: space(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.slate3,
  },
}));
