import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon, ClockIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";

export type BookingWaitlistEmptyProps = {
  waitlistLoading?: boolean;
  isOnWaitlist?: boolean;
  onJoinWaitlist: () => void;
};

export function BookingWaitlistEmpty({
  waitlistLoading = false,
  isOnWaitlist = false,
  onJoinWaitlist,
}: BookingWaitlistEmptyProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.wrapper}>
      <Flex alignItems="center" gap={2}>
        <View
          style={[
            styles.iconCircle,
            isOnWaitlist && { backgroundColor: theme.colors.successSubtle },
          ]}
        >
          {isOnWaitlist ? (
            <CheckIcon size={32} color={theme.colors.success} />
          ) : (
            <ClockIcon size={32} color={theme.colors.secondary} />
          )}
        </View>

        <Flex alignItems="center" gap={0.75}>
          <Typography size="text-md" weight="semibold" style={styles.centered}>
            {isOnWaitlist ? "You're on the waitlist" : "No times available"}
          </Typography>
          <Typography size="text-sm" color="secondary" style={styles.centered}>
            {isOnWaitlist
              ? "We'll notify you if a table opens for your party."
              : "Try another day or join the waitlist."}
          </Typography>
        </Flex>

        {isOnWaitlist ? (
          <View style={styles.statusPill}>
            <CheckIcon size={14} color={theme.colors.success} />
            <Typography size="text-xs" weight="semibold" color="success">
              Joined for this date
            </Typography>
          </View>
        ) : (
          <Button
            size="md"
            variant="filled"
            color="secondary"
            loading={waitlistLoading}
            onPress={onJoinWaitlist}
          >
            Join waitlist
          </Button>
        )}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrapper: {
    marginHorizontal: space(2),
    paddingTop: space(4),
    paddingBottom: space(2),
  },
  iconCircle: {
    width: space(7),
    height: space(7),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(0.75),
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.full,
    backgroundColor: colors.successSubtle,
  },
  centered: {
    textAlign: "center",
  },
}));
