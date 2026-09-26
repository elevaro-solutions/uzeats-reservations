import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BellIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
} from "@/components";
import {
  MY_OWNER_OVERVIEW,
  RestaurantSwitcher,
  useActiveRestaurant,
} from "@/features/restaurants";
import { todayIsoDate } from "@/lib/helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import { OverviewSkeleton, OverviewTodayContent } from "./components";

type OwnerOverviewQuery = {
  myOwnerOverview: {
    todayReservations: number;
    todayCovers: number;
    openWaitlist: number;
    unreadNotifications: number;
    locations: Array<{
      restaurantId: string;
      todayReservations: number;
      todayCovers: number;
      openWaitlist: number;
    }>;
  };
};

export function OverviewFeature() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const {
    activeRestaurantId,
    activeRestaurant,
    restaurants,
    loading: restaurantsLoading,
  } = useActiveRestaurant();
  const timeZone = activeRestaurant?.timezone ?? PLATFORM_TIMEZONE;
  const overviewDate = todayIsoDate(timeZone);

  const { data, loading, error, refetch } = useQuery<OwnerOverviewQuery>(
    MY_OWNER_OVERVIEW,
    {
      variables: { date: overviewDate },
      skip: restaurants.length === 0,
      fetchPolicy: "cache-and-network",
    },
  );

  const overview = data?.myOwnerOverview;
  const location = overview?.locations.find(
    (l) => l.restaurantId === activeRestaurantId,
  );

  const covers = location?.todayCovers ?? overview?.todayCovers ?? 0;
  const reservations =
    location?.todayReservations ?? overview?.todayReservations ?? 0;
  const waitlist = location?.openWaitlist ?? overview?.openWaitlist ?? 0;
  const unread = overview?.unreadNotifications ?? 0;

  const isLoading = restaurantsLoading || (loading && !overview);
  const isEmpty = !isLoading && restaurants.length === 0;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch({ date: overviewDate });
    } finally {
      setRefreshing(false);
    }
  }, [overviewDate, refetch]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        style={styles.header}
      >
        <Flex flex={1} style={styles.switcherWrap}>
          <RestaurantSwitcher compact />
        </Flex>
        <IconButton
          icon={<BellIcon />}
          variant="surface"
          size="sm"
          onPress={() => router.push("/notifications")}
          accessibilityLabel={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          style={styles.bell}
        />
      </Flex>

      {error ? (
        <View style={styles.pad}>
          <InlineAlert
            tone="error"
            title="Couldn't load overview"
            message={error.message}
          />
          <Button
            fullWidth
            style={styles.retry}
            onPress={() => {
              void refetch();
            }}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {isLoading ? <OverviewSkeleton /> : null}

      {isEmpty ? (
        <View style={styles.pad}>
          <Empty
            title="No restaurants yet"
            description="Ask your owner to add you to a location in Partner Hub."
          />
        </View>
      ) : null}

      {!isLoading && !isEmpty ? (
        <OverviewTodayContent
          covers={covers}
          reservations={reservations}
          waitlist={waitlist}
          unread={unread}
          contentPaddingBottom={insets.bottom + theme.space(3)}
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh();
          }}
          onOpenReservations={() => router.push("/(tabs)/reservations")}
          onOpenWaitlist={() => router.push("/waitlist")}
          onOpenFloor={() => router.push("/(tabs)/floor")}
          onOpenMessages={() => router.push("/(tabs)/messages")}
          onOpenNotifications={() => router.push("/notifications")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    paddingTop: space(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
    gap: space(1),
  },
  switcherWrap: {
    minWidth: 0,
  },
  bell: {
    borderRadius: radius.full,
  },
  pad: {
    padding: space(2),
  },
  retry: {
    marginTop: space(1.5),
  },
}));
