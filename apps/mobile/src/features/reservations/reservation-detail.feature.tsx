import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Chip,
  Flex,
  InlineAlert,
  Input,
  Loader,
  RemoteImage,
  Typography,
} from "@/components";
import { MY_RESERVATIONS, UPDATE_RESERVATION_STATUS } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import {
  BOOKABLE_OCCASIONS,
  OCCASION_LABELS,
  RESERVATION_CANCELLATION_REASONS,
  type Occasion,
} from "@reservations/shared";

import {
  BOOKING_AVAILABILITY,
  CONFIRM_DEPOSIT,
  MY_RESERVATION,
  UPDATE_RESERVATION,
} from "../booking/api/booking.operations";
import { BookingDateScroller } from "../booking/components/booking-date-scroller.component";
import { BookingTimeSections } from "../booking/components/booking-time-sections.component";
import {
  extractPaymentIntentId,
  useDepositPayment,
} from "../booking/hooks/use-deposit-payment.hook";
import { formatSlotTime } from "../booking/helpers/time-slots.helpers";
import { PartySizePicker } from "../search/components/party-size-picker.component";
import {
  formatReservationWhen,
  isReservationUpcoming,
  needsDepositPayment,
  statusLabel,
} from "./helpers/reservation-display.helpers";

function toIsoDateFromSlot(slotStart: string): string {
  const d = new Date(slotStart);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReservationDetailFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | undefined>();
  const [cancelDetails, setCancelDetails] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const { paying, payDeposit } = useDepositPayment();

  const { data, loading, refetch } = useQuery(MY_RESERVATION, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  });

  const reservation = data?.myReservation;
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);

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
        refetchQueries: [{ query: MY_RESERVATIONS }],
      });
      setCancelOpen(false);
      Alert.alert("Cancelled", "Your reservation has been cancelled.");
      router.back();
    } catch (err) {
      Alert.alert("Error", getGraphQLErrorMessage(err, "Could not cancel"));
    } finally {
      setCancelling(false);
    }
  }

  async function onPayDeposit() {
    if (!reservation?.clientSecret) return;
    const paid = await payDeposit({
      clientSecret: reservation.clientSecret,
      merchantName: reservation.restaurant?.name ?? "Tablevera",
    });
    if (!paid) return;
    try {
      await confirmDeposit({
        variables: {
          paymentIntentId: extractPaymentIntentId(reservation.clientSecret),
        },
      });
      await refetch();
      Alert.alert("Deposit paid", "Your reservation is confirmed.");
    } catch {
      Alert.alert("Deposit submitted", "Payment received — confirmation may take a moment.");
      await refetch();
    }
  }

  if (loading && !reservation) {
    return (
      <Flex flex={1} justifyContent="center" alignItems="center">
        <Loader />
      </Flex>
    );
  }

  if (!reservation) {
    return (
      <Flex flex={1} justifyContent="center" style={styles.centered}>
        <Typography>Reservation not found</Typography>
        <Button onPress={() => router.back()}>Go back</Button>
      </Flex>
    );
  }

  const photo = reservation.restaurant?.photos?.find(Boolean);
  const upcoming = isReservationUpcoming(reservation);
  const depositDue = needsDepositPayment(reservation);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Typography weight="semibold">← Back</Typography>
        </Pressable>
      </Flex>

      <ScrollView contentContainerStyle={styles.scroll}>
        {photo ? (
          <RemoteImage uri={photo} style={styles.hero} recyclingKey={reservation.id} />
        ) : null}

        <Flex gap={1} style={styles.body}>
          <Typography weight="bold" size="text-xl">
            {reservation.restaurant?.name}
          </Typography>
          <Typography color="secondary">
            {formatReservationWhen(reservation.slotStart)}
          </Typography>
          <Typography size="text-sm" color="muted">
            {reservation.partySize} guests · {statusLabel(reservation.status)}
          </Typography>

          {reservation.tables?.[0] ? (
            <Typography size="text-sm">
              Table: {reservation.tables[0].name}
            </Typography>
          ) : null}

          {reservation.guestNotes ? (
            <InlineAlert tone="info" message={reservation.guestNotes} />
          ) : null}

          {depositDue ? (
            <InlineAlert
              tone="warning"
              message={`Deposit of $${((reservation.depositAmountCents ?? 0) / 100).toFixed(2)} required to confirm.`}
            />
          ) : null}
        </Flex>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        {depositDue ? (
          <Button fullWidth size="xl" loading={paying} onPress={onPayDeposit}>
            Pay deposit
          </Button>
        ) : null}
        {upcoming ? (
          <>
            <Button fullWidth variant="outlined" onPress={() => setEditOpen(true)}>
              Edit reservation
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onPress={() => setCancelOpen(true)}
            >
              Cancel reservation
            </Button>
          </>
        ) : null}
        <Button
          fullWidth
          variant="outlined"
          onPress={() =>
            router.push({
              pathname: "/restaurant/[id]",
              params: { id: reservation.restaurant?.id ?? "" },
            })
          }
        >
          View restaurant
        </Button>
      </View>

      <CancelModal
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        cancelReason={cancelReason}
        cancelDetails={cancelDetails}
        onReasonChange={setCancelReason}
        onDetailsChange={setCancelDetails}
        onConfirm={onCancel}
        loading={cancelling}
      />

      <EditReservationModal
        visible={editOpen}
        reservation={reservation}
        onClose={() => setEditOpen(false)}
        onUpdated={() => {
          setEditOpen(false);
          refetch();
        }}
      />
    </View>
  );
}

function CancelModal({
  visible,
  onClose,
  cancelReason,
  cancelDetails,
  onReasonChange,
  onDetailsChange,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  cancelReason?: string;
  cancelDetails: string;
  onReasonChange: (value: string | undefined) => void;
  onDetailsChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Flex flex={1} style={styles.modalBody}>
        <Typography weight="bold" size="text-lg">
          Cancel reservation
        </Typography>
        <Flex direction="row" gap={1} flexWrap="wrap">
          {RESERVATION_CANCELLATION_REASONS.map((reason) => (
            <Chip
              key={reason}
              selected={cancelReason === reason}
              onPress={() => onReasonChange(reason)}
            >
              {reason}
            </Chip>
          ))}
        </Flex>
        <Input
          label="Additional details (optional)"
          value={cancelDetails}
          onChangeText={onDetailsChange}
          multiline
        />
        <Button fullWidth loading={loading} onPress={onConfirm}>
          Confirm cancellation
        </Button>
        <Button fullWidth variant="outlined" onPress={onClose}>
          Keep reservation
        </Button>
      </Flex>
    </Modal>
  );
}

function EditReservationModal({
  visible,
  reservation,
  onClose,
  onUpdated,
}: {
  visible: boolean;
  reservation: {
    id: string;
    slotStart: string;
    partySize: number;
    occasion?: string | null;
    guestNotes?: string | null;
    restaurant?: { id?: string; name?: string } | null;
  };
  onClose: () => void;
  onUpdated: () => void;
}) {
  const restaurantId = reservation.restaurant?.id;
  const [date, setDate] = useState(toIsoDateFromSlot(reservation.slotStart));
  const [partySize, setPartySize] = useState(reservation.partySize);
  const [slotStart, setSlotStart] = useState(reservation.slotStart);
  const [occasion, setOccasion] = useState(reservation.occasion ?? "none");
  const [guestNotes, setGuestNotes] = useState(reservation.guestNotes ?? "");
  const [saving, setSaving] = useState(false);

  const { data: slotsData, loading: slotsLoading } = useQuery(
    BOOKING_AVAILABILITY,
    {
      skip: !visible || !restaurantId,
      variables: { restaurantId, date, partySize },
      fetchPolicy: "network-only",
    },
  );

  const slots = useMemo(() => {
    const all = slotsData?.availability ?? [];
    return all.filter(
      (s: { time: string; available: boolean }) =>
        s.available || s.time === slotStart || s.time === reservation.slotStart,
    );
  }, [slotsData, slotStart, reservation.slotStart]);

  const [updateReservation] = useMutation(UPDATE_RESERVATION);

  async function onSave() {
    if (!slotStart) {
      Alert.alert("Select a time", "Please pick an available time slot.");
      return;
    }
    setSaving(true);
    try {
      await updateReservation({
        variables: {
          id: reservation.id,
          input: {
            partySize,
            slotStart,
            occasion,
            guestNotes: guestNotes.trim() || undefined,
          },
        },
        refetchQueries: [{ query: MY_RESERVATIONS }],
      });
      onUpdated();
    } catch (err) {
      Alert.alert("Error", getGraphQLErrorMessage(err, "Could not update"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Typography weight="bold" size="text-lg">
          Edit reservation
        </Typography>
        <BookingDateScroller selectedDate={date} onSelectDate={setDate} />
        <PartySizePicker value={partySize} onChange={setPartySize} />
        {slotsLoading ? (
          <Loader />
        ) : (
          <BookingTimeSections
            slots={slots}
            selectedSlot={slotStart}
            onSelectSlot={setSlotStart}
          />
        )}
        <Flex direction="row" gap={1} flexWrap="wrap">
          {BOOKABLE_OCCASIONS.map((value) => (
            <Chip
              key={value}
              selected={occasion === value}
              onPress={() => setOccasion(value)}
            >
              {OCCASION_LABELS[value as Occasion]}
            </Chip>
          ))}
        </Flex>
        <Input
          label="Special requests"
          value={guestNotes}
          onChangeText={setGuestNotes}
          multiline
        />
        <Button fullWidth loading={saving} onPress={onSave}>
          Save changes
        </Button>
        <Button fullWidth variant="outlined" onPress={onClose}>
          Cancel
        </Button>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
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
    paddingBottom: space(1),
  },
  scroll: {
    paddingBottom: space(4),
  },
  hero: {
    width: "100%",
    height: 200,
  },
  body: {
    padding: space(2),
  },
  footer: {
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    gap: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalBody: {
    padding: space(2),
    gap: space(1.5),
  },
}));
