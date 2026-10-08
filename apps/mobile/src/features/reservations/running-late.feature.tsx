import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon, ClockIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  Loader,
  Typography,
} from "@/components";
import { useAuth } from "@/graphql";
import { isUnauthenticatedError } from "@/lib/graphql-errors";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import { MY_RESERVATION } from "../booking/api/booking.operations";
import { formatGuestCount } from "../booking/helpers/format-guest-count.helpers";
import { dismissRunningLatePrompt } from "../notifications/helpers/reminder-late.helpers";
import { reportRunningLateAndOpenThread } from "../notifications/helpers/report-running-late.helpers";
import { formatReservationWhen } from "./helpers/reservation-display.helpers";

type MyReservationQuery = {
  myReservation: {
    id: string;
    slotStart: string;
    partySize: number;
    restaurant?: {
      name?: string | null;
      timezone?: string | null;
    } | null;
  } | null;
};

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <Flex
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      gap={2}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <Typography size="text-sm" color="muted">
        {label}
      </Typography>
      <Typography weight="semibold" align="right" style={styles.rowValue}>
        {value}
      </Typography>
    </Flex>
  );
}

export function RunningLateFeature() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();
  const [reporting, setReporting] = useState(false);

  const { data, loading, error, refetch } = useQuery<MyReservationQuery>(
    MY_RESERVATION,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "network-only",
    },
  );

  const reservation = data?.myReservation;

  function leaveWithoutNotifying() {
    if (id) dismissRunningLatePrompt(id);
    if (id) {
      router.replace(`/reservations/${id}` as never);
    } else {
      router.back();
    }
  }

  async function onYes() {
    if (!id) return;
    setReporting(true);
    try {
      const ok = await reportRunningLateAndOpenThread(id, {
        navigate: false,
      });
      if (ok) {
        router.replace(`/reservations/${id}/messages` as never);
      }
    } finally {
      setReporting(false);
    }
  }

  const topBar = (
    <Flex direction="row" alignItems="center" style={styles.topBar}>
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={leaveWithoutNotifying}
        accessibilityLabel="Go back"
        style={styles.chromeBtn}
      />
      <View style={styles.sideSlot} />
    </Flex>
  );

  if (loading && !reservation) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar}
        <Flex flex={1} alignItems="center" justifyContent="center">
          <Loader />
        </Flex>
      </View>
    );
  }

  if ((error && !reservation) || !reservation) {
    const needsAuth = !user || (error && isUnauthenticatedError(error));
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar}
        <Flex
          flex={1}
          justifyContent="center"
          style={styles.centered}
        >
          {needsAuth ? (
            <Empty
              title="Sign in to continue"
              description="Sign in to tell the restaurant if you are running late."
            >
              <Button
                onPress={() =>
                  router.push({
                    pathname: "/sign-in",
                    params: {
                      next: id
                        ? `/reservations/${id}/running-late`
                        : "/reservations",
                    },
                  })
                }
              >
                Sign in
              </Button>
            </Empty>
          ) : (
            <Empty
              title="Couldn't load reservation"
              description="Check your connection and try again."
            >
              <Button variant="outlined" onPress={() => void refetch()}>
                Retry
              </Button>
            </Empty>
          )}
        </Flex>
      </View>
    );
  }

  const timeZone = reservation.restaurant?.timezone ?? PLATFORM_TIMEZONE;
  const when = formatReservationWhen(reservation.slotStart, timeZone);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {topBar}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + theme.space(16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Flex alignItems="center" gap={1} style={styles.hero}>
          <View style={styles.halo}>
            <View style={styles.iconWell}>
              <ClockIcon
                size={32}
                color={theme.colors.white}
                strokeWidth={2.5}
              />
            </View>
          </View>
          <Typography weight="bold" size="text-xl" align="center">
            Are you running late?
          </Typography>
          <Typography size="text-sm" color="secondary" align="center">
            Let the restaurant know so they can hold your table.
          </Typography>
        </Flex>

        <Typography weight="semibold" size="text-md">
          Reservation details
        </Typography>
        <View style={styles.card}>
          <DetailRow
            label="Restaurant"
            value={reservation.restaurant?.name ?? "Restaurant"}
          />
          <DetailRow label="Date & time" value={when} />
          <DetailRow
            label="Party"
            value={formatGuestCount(reservation.partySize)}
            last
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <View style={styles.action}>
          <Button
            fullWidth
            size="xl"
            color="error"
            loading={reporting}
            onPress={() => {
              void onYes();
            }}
          >
            Yes
          </Button>
        </View>
        <View style={styles.action}>
          <Button
            fullWidth
            size="xl"
            color="success"
            disabled={reporting}
            onPress={leaveWithoutNotifying}
          >
            No
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    padding: space(2),
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: space(2.5),
    gap: space(2),
  },
  hero: {
    paddingTop: space(2),
    paddingBottom: space(1),
  },
  halo: {
    width: space(12),
    height: space(12),
    borderRadius: radius.full,
    backgroundColor: colors.warningSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(0.5),
  },
  iconWell: {
    width: space(8),
    height: space(8),
    borderRadius: radius.full,
    backgroundColor: colors.amber8,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.slate1,
    borderWidth: 1,
    borderColor: colors.slate4,
    overflow: "hidden",
  },
  row: {
    paddingVertical: space(1.75),
    paddingHorizontal: space(2),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  rowValue: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    paddingHorizontal: space(2.5),
    paddingTop: space(1.5),
    gap: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
  action: {
    flex: 1,
  },
}));
