import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  ArmchairIcon,
  BellIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  MailIcon,
  UsersIcon,
} from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  Typography,
} from "@/components";
import {
  MY_OWNER_OVERVIEW,
  RestaurantSwitcher,
  useActiveRestaurant,
} from "@/features/restaurants";
import { todayIsoDate } from "@/lib/dates.helpers";

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
    restaurants,
    loading: restaurantsLoading,
  } = useActiveRestaurant();

  const { data, loading, error, refetch } = useQuery<OwnerOverviewQuery>(
    MY_OWNER_OVERVIEW,
    {
      variables: { date: todayIsoDate() },
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
      await refetch({ date: todayIsoDate() });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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

      {isLoading ? <Loader fullScreen /> : null}

      {isEmpty ? (
        <View style={styles.pad}>
          <Empty
            title="No restaurants yet"
            description="Ask your owner to add you to a location in Partner Hub."
          />
        </View>
      ) : null}

      {!isLoading && !isEmpty ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.space(3) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          <Typography
            weight="bold"
            size="display-xs"
            style={styles.sectionTitle}
          >
            Today
          </Typography>

          <View style={styles.snapshotGrid}>
            <SnapshotCard
              label="Covers"
              value={covers}
              icon={<UsersIcon size={22} color={theme.colors.primary} />}
            />
            <SnapshotCard
              label="Reservations"
              value={reservations}
              icon={
                <CalendarCheckIcon size={22} color={theme.colors.primary} />
              }
              onPress={() => router.push("/(tabs)/reservations")}
            />
            <SnapshotCard
              label="Waitlist"
              value={waitlist}
              icon={<UsersIcon size={22} color={theme.colors.warningPress} />}
              onPress={() => router.push("/waitlist")}
            />
            <SnapshotCard
              label="Unread"
              value={unread}
              icon={<BellIcon size={22} color={theme.colors.info} />}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <Typography
            weight="semibold"
            size="text-lg"
            style={styles.shortcutsTitle}
          >
            Shortcuts
          </Typography>

          <Flex gap={1.5}>
            <ShortcutButton
              label="Reservations"
              onPress={() => router.push("/(tabs)/reservations")}
              icon={
                <CalendarCheckIcon size={22} color={theme.colors.textPrimary} />
              }
            />
            <ShortcutButton
              label="Waitlist"
              onPress={() => router.push("/waitlist")}
              icon={<UsersIcon size={22} color={theme.colors.textPrimary} />}
            />
            <ShortcutButton
              label="Floor"
              onPress={() => router.push("/(tabs)/floor")}
              icon={<ArmchairIcon size={22} color={theme.colors.textPrimary} />}
            />
            <ShortcutButton
              label="Messages"
              onPress={() => router.push("/(tabs)/messages")}
              icon={<MailIcon size={22} color={theme.colors.textPrimary} />}
            />
          </Flex>
        </ScrollView>
      ) : null}
    </View>
  );
}

function SnapshotCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <Flex gap={1} style={styles.card}>
      {icon}
      <Typography weight="bold" size="display-xs">
        {value}
      </Typography>
      <Typography size="text-sm" color="secondary">
        {label}
      </Typography>
    </Flex>
  );

  if (!onPress) return <View style={styles.cardWrap}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {content}
    </Pressable>
  );
}

function ShortcutButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: ReactNode;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Flex direction="row" alignItems="center" justifyContent="space-between">
        <Flex direction="row" alignItems="center" gap={1.5}>
          {icon}
          <Typography weight="semibold" size="text-md">
            {label}
          </Typography>
        </Flex>
        <ChevronRightIcon size={18} color={theme.colors.textMuted} />
      </Flex>
    </Pressable>
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
    borderBottomColor: colors.slate3,
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
  content: {
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
    gap: space(1),
  },
  sectionTitle: {
    marginBottom: space(1),
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(1.5),
  },
  cardWrap: {
    width: "47%",
    flexGrow: 1,
  },
  card: {
    padding: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    minHeight: space(14),
  },
  cardPressed: {
    opacity: 0.85,
  },
  shortcutsTitle: {
    marginTop: space(2.5),
    marginBottom: space(1),
  },
  shortcut: {
    minHeight: space(7),
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    justifyContent: "center",
  },
}));
