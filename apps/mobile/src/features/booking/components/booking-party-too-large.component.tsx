import { Linking, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { ArmchairIcon, PhoneIcon } from "@/assets";
import { Button, Flex, Typography } from "@/components";
import { buildTelUrl } from "@/features/restaurant-profile/helpers/restaurant-links.helpers";

export type BookingPartyTooLargeProps = {
  maxBookablePartySize: number;
  restaurantPhone?: string | null;
};

export function BookingPartyTooLarge({
  maxBookablePartySize,
  restaurantPhone,
}: BookingPartyTooLargeProps) {
  const { theme } = useUnistyles();
  const hasPhone = Boolean(restaurantPhone?.trim());

  function onCallRestaurant() {
    if (!restaurantPhone) return;
    Linking.openURL(buildTelUrl(restaurantPhone)).catch(() => undefined);
  }

  return (
    <View style={styles.wrapper}>
      <Flex alignItems="center" gap={2}>
        <View style={styles.iconCircle}>
          <ArmchairIcon size={32} color={theme.colors.secondary} />
        </View>

        <Flex alignItems="center" gap={0.75}>
          <Typography size="text-md" weight="semibold" style={styles.centered}>
            {`Seats up to ${maxBookablePartySize} online`}
          </Typography>
          <Typography size="text-sm" color="secondary" style={styles.centered}>
            Reduce your party size to see times.
          </Typography>
        </Flex>

        {hasPhone ? (
          <Button
            size="md"
            variant="filled"
            color="secondary"
            startIcon={<PhoneIcon />}
            onPress={onCallRestaurant}
          >
            Call restaurant
          </Button>
        ) : null}
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
  centered: {
    textAlign: "center",
  },
}));
