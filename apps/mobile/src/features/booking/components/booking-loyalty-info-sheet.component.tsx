import { Modal, Pressable, ScrollView, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LOYALTY, RESTAURANT_LOYALTY } from "@reservations/shared";

import { XIcon } from "@/assets";
import { Flex, IconButton, Typography } from "@/components";

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
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.backdropLayer}
        >
          <Pressable
            style={styles.backdrop(theme.colors.overlay)}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close how points work"
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={styles.sheet(theme.colors.background)}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <Flex
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            style={styles.header}
          >
            <View style={styles.headerTitleBlock}>
              <Typography size="text-xl" weight="bold">
                How {title.toLowerCase()} work
              </Typography>
              <Typography size="text-sm" color="secondary">
                Earn, redeem, and save on deposits
              </Typography>
            </View>
            <IconButton
              icon={<XIcon />}
              variant="ghost"
              size="sm"
              accessibilityLabel="Close"
              onPress={onClose}
            />
          </Flex>

          <ScrollView
            bounces
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.bodyScroll}
            contentContainerStyle={[
              styles.body,
              { paddingBottom: Math.max(insets.bottom, theme.space(2.5)) },
            ]}
            keyboardShouldPersistTaps="handled"
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
                Choose an amount on the card to reduce the deposit due. The
                remainder is authorized as a card hold — only captured if you
                no-show or cancel late.
              </Typography>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
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
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: (backgroundColor: string) => ({
    flex: 1,
    backgroundColor,
  }),
  sheet: (backgroundColor: string) => ({
    backgroundColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
    overflow: "hidden",
  }),
  handleRow: {
    alignItems: "center",
    paddingTop: space(1.25),
    paddingBottom: space(0.5),
  },
  handle: {
    width: space(5),
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.slate5,
  },
  header: {
    paddingHorizontal: space(2.5),
    paddingTop: space(1),
    paddingBottom: space(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
    flexShrink: 0,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: space(0.5),
    paddingRight: space(1),
  },
  bodyScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: space(2.5),
    paddingTop: space(2.5),
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
