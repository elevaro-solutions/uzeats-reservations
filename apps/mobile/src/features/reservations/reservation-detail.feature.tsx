import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { ChevronLeftIcon, MoreVerticalIcon } from "@/assets";
import { Button, Empty, Flex, IconButton, Typography } from "@/components";
import {
  MY_RESERVATIONS,
  SAVE_RESTAURANT,
  UPDATE_RESERVATION_STATUS,
} from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { useAppStore } from "@/store";
import { AddReviewSheet } from "@/features/restaurant-profile/components/add-review-sheet.component";

import {
  CONFIRM_DEPOSIT,
  MY_RESERVATION,
} from "../booking/api/booking.operations";
import {
  extractPaymentIntentId,
  useDepositPayment,
} from "../booking/hooks/use-deposit-payment.hook";
import { CancelReservationModal } from "./components/cancel-reservation-modal.component";
import { ReservationBillingSheet } from "./components/reservation-billing-sheet.component";
import { ReservationDetailRows } from "./components/reservation-detail-rows.component";
import { ReservationDetailSkeleton } from "./components/reservation-detail-skeleton.component";
import { ReservationOverflowMenu } from "./components/reservation-overflow-menu.component";
import { ReservationRestaurantCard } from "./components/reservation-restaurant-card.component";
import {
  primaryCtaLabel,
  resolveOverflowActions,
  resolvePrimaryCta,
  visitIneligibleCaption,
  type OverflowActionId,
  type PrimaryCtaKind,
} from "./helpers/reservation-actions.helpers";
import { addReservationToCalendar } from "./helpers/reservation-calendar.helpers";
import {
  canEditReservation,
  formatReservationWhen,
  needsDepositPayment,
} from "./helpers/reservation-display.helpers";

type MyReservationQuery = {
  myReservation: {
    id: string;
    status: string;
    slotStart: string;
    slotEnd?: string | null;
    partySize: number;
    occasion?: string | null;
    guestNotes?: string | null;
    depositAmountCents?: number | null;
    depositStatus?: string | null;
    clientSecret?: string | null;
    loyaltyPointsEarned?: number | null;
    hasReview?: boolean | null;
    packageTitle?: string | null;
    packagePriceCents?: number | null;
    restaurant?: {
      id: string;
      name?: string | null;
      slug?: string | null;
      photos?: (string | null)[] | null;
      phone?: string | null;
      averageRating?: number | null;
      isSaved?: boolean | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        neighborhood?: string | null;
      } | null;
    } | null;
    tables?: {
      id: string;
      name: string;
      photoUrl?: string | null;
      floorArea?: string | null;
    }[] | null;
  } | null;
};

export function ReservationDetailFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const setDiscovery = useAppStore((s) => s.setDiscovery);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | undefined>();
  const [cancelDetails, setCancelDetails] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { paying, payDeposit } = useDepositPayment();

  const { data, loading, error, refetch } = useQuery<MyReservationQuery>(
    MY_RESERVATION,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "network-only",
    },
  );

  const reservation = data?.myReservation;
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [saveRestaurant, { loading: saving }] = useMutation(SAVE_RESTAURANT);

  const primary = useMemo(
    () => (reservation ? resolvePrimaryCta(reservation) : null),
    [reservation],
  );
  const overflowActions = useMemo(
    () =>
      reservation ? resolveOverflowActions(reservation, primary) : [],
    [reservation, primary],
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function onCancel() {
    if (!id) return;
    setCancelling(true);
    try {
      const reason = [cancelReason, cancelDetails.trim()]
        .filter(Boolean)
        .join(": ");
      await updateStatus({
        variables: {
          id,
          status: "cancelled",
          reason: reason || undefined,
        },
        refetchQueries: [
          { query: MY_RESERVATIONS },
          { query: MY_RESERVATION, variables: { id } },
        ],
      });
      setCancelOpen(false);
      setCancelReason(undefined);
      setCancelDetails("");
      toast.success("Reservation cancelled");
      await refetch();
    } catch (err) {
      Alert.alert("Error", getGraphQLErrorMessage(err, "Could not cancel"));
      setCancelOpen(false);
      await refetch();
    } finally {
      setCancelling(false);
    }
  }

  async function onPayDeposit() {
    if (!reservation?.clientSecret) {
      Alert.alert(
        "Payment unavailable",
        "Deposit payment is not ready yet. Try again in a moment.",
      );
      return;
    }
    const payment = await payDeposit({
      clientSecret: reservation.clientSecret,
      merchantName: reservation.restaurant?.name ?? "Tablevera",
    });
    if (!payment.paid) {
      if (payment.error) {
        Alert.alert("Payment failed", payment.error);
      }
      return;
    }
    try {
      await confirmDeposit({
        variables: {
          paymentIntentId: extractPaymentIntentId(reservation.clientSecret),
        },
        refetchQueries: [
          { query: MY_RESERVATIONS },
          { query: MY_RESERVATION, variables: { id } },
        ],
      });
      setBillingOpen(false);
      await refetch();
    } catch {
      Alert.alert(
        "Deposit submitted",
        "Payment received — confirmation may take a moment.",
      );
      setBillingOpen(false);
      await refetch();
    }
  }

  function goToRestaurant() {
    const restaurantId = reservation?.restaurant?.id;
    if (!restaurantId) return;
    router.push({
      pathname: "/restaurant/[id]",
      params: { id: restaurantId },
    });
  }

  function bookAgain() {
    const restaurantId = reservation?.restaurant?.id;
    if (!restaurantId) return;
    setDiscovery({ partySize: reservation.partySize || 2 });
    router.push({
      pathname: "/restaurant/[id]/book",
      params: { id: restaurantId },
    });
  }

  async function onSaveRestaurant() {
    const restaurantId = reservation?.restaurant?.id;
    if (!restaurantId) return;
    try {
      await saveRestaurant({
        variables: { restaurantId },
        refetchQueries: [
          { query: MY_RESERVATIONS },
          { query: MY_RESERVATION, variables: { id } },
        ],
      });
      await refetch();
    } catch (err) {
      Alert.alert(
        "Couldn't save",
        getGraphQLErrorMessage(err, "Could not save restaurant"),
      );
    }
  }

  async function onAddToCalendar() {
    if (!reservation) return;
    try {
      const saved = await addReservationToCalendar({
        restaurant: reservation.restaurant,
        partySize: reservation.partySize,
        slotStart: reservation.slotStart,
        slotEnd: reservation.slotEnd,
        guestNotes: reservation.guestNotes,
      });
      if (saved) {
        toast.success("Added to calendar");
      }
    } catch (err) {
      Alert.alert(
        "Calendar",
        err instanceof Error ? err.message : "Could not add to calendar",
      );
    }
  }

  function handlePrimary(kind: PrimaryCtaKind) {
    if (kind === "pay_deposit") void onPayDeposit();
    else if (kind === "leave_review") setReviewOpen(true);
    else if (kind === "book_again") bookAgain();
  }

  function handleOverflow(actionId: OverflowActionId) {
    switch (actionId) {
      case "edit":
        if (id) {
          router.push(`/reservations/${id}/edit`);
        }
        break;
      case "cancel":
        setCancelOpen(true);
        break;
      case "message":
        if (id) {
          router.push(`/reservations/${id}/messages`);
        }
        break;
      case "add_to_calendar":
        void onAddToCalendar();
        break;
      case "book_again":
        bookAgain();
        break;
      case "save_restaurant":
        void onSaveRestaurant();
        break;
      case "leave_review":
        setReviewOpen(true);
        break;
      case "billing":
        setBillingOpen(true);
        break;
      default:
        break;
    }
  }

  const topBar = (showOverflow: boolean) => (
    <Flex direction="row" alignItems="center" style={styles.topBar}>
      <IconButton
        icon={<ChevronLeftIcon />}
        variant="surface"
        size="sm"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={styles.chromeBtn}
      />
      <Typography weight="semibold" size="text-lg" style={styles.topTitle}>
        Reservation
      </Typography>
      {showOverflow ? (
        <IconButton
          icon={<MoreVerticalIcon />}
          variant="surface"
          size="sm"
          onPress={() => setOverflowOpen(true)}
          accessibilityLabel="More actions"
          disabled={overflowActions.length === 0 && !saving}
          style={styles.chromeBtn}
        />
      ) : (
        <View style={styles.sideSlot} />
      )}
    </Flex>
  );

  if (loading && !reservation) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {topBar(false)}
        <ReservationDetailSkeleton />
      </View>
    );
  }

  if (error && !reservation) {
    return (
      <Flex
        flex={1}
        justifyContent="center"
        style={[styles.centered, { paddingTop: insets.top }]}
      >
        <Empty
          title="Couldn't load reservation"
          description="Check your connection and try again."
        >
          <Button variant="outlined" onPress={() => void refetch()}>
            Retry
          </Button>
          <Button variant="outlined" onPress={() => router.back()}>
            Go back
          </Button>
        </Empty>
      </Flex>
    );
  }

  if (!reservation) {
    return (
      <Flex
        flex={1}
        justifyContent="center"
        style={[styles.centered, { paddingTop: insets.top }]}
      >
        <Empty
          title="Reservation not found"
          description="It may have been removed or you no longer have access."
        >
          <Button onPress={() => router.back()}>Go back</Button>
        </Empty>
      </Flex>
    );
  }

  const canEdit = canEditReservation(reservation);
  const depositDue = needsDepositPayment(reservation);
  const ineligibleCaption = visitIneligibleCaption(reservation);
  const restaurantPhoto = reservation.restaurant?.photos?.find(Boolean);
  const overflowSubtitle = [
    formatReservationWhen(reservation.slotStart),
    `party of ${reservation.partySize}`,
  ].join(" · ");
  const footerPad = primary
    ? theme.space(10) + Math.max(insets.bottom, theme.space(2))
    : Math.max(insets.bottom, theme.space(3));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {topBar(true)}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: footerPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
          />
        }
      >
        <Flex gap={2.5} style={styles.body}>
          <ReservationRestaurantCard
            restaurant={reservation.restaurant}
            reservationId={reservation.id}
            onPress={
              reservation.restaurant?.id ? goToRestaurant : undefined
            }
          />

          <ReservationDetailRows
            reservation={reservation}
            canEdit={canEdit}
            ineligibleCaption={ineligibleCaption}
            onEdit={
              id ? () => router.push(`/reservations/${id}/edit`) : undefined
            }
          />
        </Flex>
      </ScrollView>

      {primary ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
          ]}
        >
          <Button
            fullWidth
            size="xl"
            loading={primary === "pay_deposit" ? paying : false}
            onPress={() => handlePrimary(primary)}
          >
            {primary === "pay_deposit" && depositDue
              ? `${primaryCtaLabel(primary)} · $${((reservation.depositAmountCents ?? 0) / 100).toFixed(2)}`
              : primaryCtaLabel(primary)}
          </Button>
        </View>
      ) : null}

      <ReservationOverflowMenu
        visible={overflowOpen}
        actions={overflowActions}
        onClose={() => setOverflowOpen(false)}
        onSelect={handleOverflow}
        restaurantName={reservation.restaurant?.name}
        restaurantPhoto={restaurantPhoto}
        subtitle={overflowSubtitle}
        status={reservation.status}
        slotStart={reservation.slotStart}
        slotEnd={reservation.slotEnd}
        depositStatus={reservation.depositStatus}
        depositAmountCents={reservation.depositAmountCents}
      />

      <ReservationBillingSheet
        visible={billingOpen}
        onClose={() => setBillingOpen(false)}
        restaurantName={reservation.restaurant?.name}
        slotStart={reservation.slotStart}
        slotEnd={reservation.slotEnd}
        status={reservation.status}
        depositAmountCents={reservation.depositAmountCents ?? 0}
        depositStatus={reservation.depositStatus ?? "none"}
        paying={paying}
        onPayDeposit={() => void onPayDeposit()}
      />

      <CancelReservationModal
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        cancelReason={cancelReason}
        cancelDetails={cancelDetails}
        onReasonChange={setCancelReason}
        onDetailsChange={setCancelDetails}
        onConfirm={() => void onCancel()}
        loading={cancelling}
      />

      <AddReviewSheet
        visible={reviewOpen}
        restaurantName={reservation.restaurant?.name ?? "Restaurant"}
        restaurantPhoto={restaurantPhoto}
        reservationId={reservation.id}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => {
          setReviewOpen(false);
          void refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    padding: space(2),
    gap: space(2),
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  chromeBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    width: space(5),
    height: space(5),
  },
  scroll: {
    flexGrow: 1,
  },
  body: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
