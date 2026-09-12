import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { OCCASIONS, type Occasion } from "@reservations/shared";

import { ChevronLeftIcon } from "@/assets";
import {
  Button,
  Empty,
  Flex,
  IconButton,
  Loader,
  Typography,
} from "@/components";
import { MY_RESERVATIONS, useAuth } from "@/graphql";
import {
  getGraphQLErrorMessage,
  isUnauthenticatedError,
} from "@/lib/graphql-errors";
import { toIsoDate } from "@/lib/helpers/date-time.helpers";

import {
  BOOKABLE_TABLES,
  BOOKING_AVAILABILITY,
  BOOKING_RESTAURANT,
  MY_RESERVATION,
  UPDATE_RESERVATION,
} from "../booking/api/booking.operations";
import { BookingPreferencesSection } from "../booking/components/booking-preferences-section.component";
import { BookingQuickSelectors } from "../booking/components/booking-quick-selectors.component";
import { BookingSection } from "../booking/components/booking-section.component";
import { BookingTablePicker } from "../booking/components/booking-table-picker.component";
import { BookingTimeSections } from "../booking/components/booking-time-sections.component";
import { canProceedToDetails, slotTimesEqual } from "../booking/helpers/booking-validation.helpers";
import {
  BOOKING_MAX_DAYS_AHEAD,
  clampBookingDate,
  EMPTY_AVAILABILITY_SLOTS,
  filterBookableSlots,
} from "../booking/helpers/time-slots.helpers";
import type {
  AvailabilitySlot,
  BookableTable,
  RestaurantBookingInfo,
} from "../booking/types";
import { ConfirmEditReservationSheet } from "./components/confirm-edit-reservation-sheet.component";
import { canEditReservation } from "./helpers/reservation-display.helpers";

type MyReservationQuery = {
  myReservation: {
    id: string;
    status: string;
    slotStart: string;
    slotEnd?: string | null;
    partySize: number;
    occasion?: string | null;
    guestNotes?: string | null;
    restaurant?: {
      id: string;
      name?: string | null;
    } | null;
    tables?: { id: string; name: string }[] | null;
  } | null;
};

type ReservationSnapshot = NonNullable<MyReservationQuery["myReservation"]>;

function hasEditChanges(params: {
  reservation: ReservationSnapshot;
  partySize: number;
  slotStart: string | null;
  occasion: Occasion;
  guestNotes: string;
  selectedTableId: string | null;
  allowGuestTableSelection: boolean;
}): boolean {
  const {
    reservation,
    partySize,
    slotStart,
    occasion,
    guestNotes,
    selectedTableId,
    allowGuestTableSelection,
  } = params;

  if (partySize !== reservation.partySize) return true;
  if (
    !slotStart ||
    !slotTimesEqual(slotStart, reservation.slotStart)
  ) {
    return true;
  }
  if (occasion !== parseOccasion(reservation.occasion)) return true;
  if (guestNotes.trim() !== (reservation.guestNotes ?? "").trim()) return true;
  if (allowGuestTableSelection) {
    const originalTableId = reservation.tables?.[0]?.id ?? null;
    if (selectedTableId !== originalTableId) return true;
  }
  return false;
}

function toIsoDateFromSlot(slotStart: string): string {
  return toIsoDate(new Date(slotStart));
}

function parseOccasion(value: string | null | undefined): Occasion {
  if (value && (OCCASIONS as readonly string[]).includes(value)) {
    return value as Occasion;
  }
  return "none";
}

export function EditReservationFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();

  const { data, loading, error } = useQuery<MyReservationQuery>(MY_RESERVATION, {
    variables: { id },
    skip: !id,
  });

  const reservation = data?.myReservation;
  const restaurantId = reservation?.restaurant?.id;

  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<Occasion>("none");
  const [guestNotes, setGuestNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reservation || initialized) return;
    setDate(toIsoDateFromSlot(reservation.slotStart));
    setPartySize(reservation.partySize);
    setSlotStart(reservation.slotStart);
    setOccasion(parseOccasion(reservation.occasion));
    setGuestNotes(reservation.guestNotes ?? "");
    setSelectedTableId(reservation.tables?.[0]?.id ?? null);
    setInitialized(true);
  }, [reservation, initialized]);

  const {
    data: restaurantData,
    loading: restaurantLoading,
  } = useQuery<{ restaurant: RestaurantBookingInfo | null }>(BOOKING_RESTAURANT, {
    variables: { id: restaurantId },
    skip: !restaurantId,
  });

  const restaurant = restaurantData?.restaurant;
  const minAdvanceHours = restaurant?.bookingWindow?.minAdvanceHours ?? 0;
  const maxAdvanceDays =
    restaurant?.bookingWindow?.maxAdvanceDays ?? BOOKING_MAX_DAYS_AHEAD;
  const allowGuestTableSelection = !!restaurant?.allowGuestTableSelection;

  useEffect(() => {
    if (!restaurant || !date) return;
    const clamped = clampBookingDate(date, maxAdvanceDays);
    if (clamped !== date) setDate(clamped);
  }, [restaurant, maxAdvanceDays, date]);

  const originalSlotStart = reservation?.slotStart ?? null;

  const {
    data: availabilityData,
    loading: availabilityLoading,
  } = useQuery<{ availability: AvailabilitySlot[] }>(BOOKING_AVAILABILITY, {
    variables: { restaurantId, date, partySize },
    skip: !restaurantId || !date || !initialized,
    fetchPolicy: "network-only",
  });

  const slots = useMemo(() => {
    const availability =
      availabilityData?.availability ?? EMPTY_AVAILABILITY_SLOTS;
    const filtered = filterBookableSlots(availability, minAdvanceHours);
    return filtered
      .filter(
        (s) =>
          s.available ||
          (originalSlotStart != null &&
            slotTimesEqual(s.time, originalSlotStart)) ||
          (slotStart != null && slotTimesEqual(s.time, slotStart)),
      )
      .map((s) => {
        const keepSelectable =
          (originalSlotStart != null &&
            slotTimesEqual(s.time, originalSlotStart)) ||
          (slotStart != null && slotTimesEqual(s.time, slotStart));
        return keepSelectable ? { ...s, available: true } : s;
      });
  }, [availabilityData, minAdvanceHours, originalSlotStart, slotStart]);

  const { data: tablesData, loading: tablesLoading } = useQuery<{
    bookableTables: BookableTable[];
  }>(BOOKABLE_TABLES, {
    variables: {
      restaurantId,
      slotStart,
      partySize,
    },
    skip: !restaurantId || !slotStart || !allowGuestTableSelection,
    fetchPolicy: "no-cache",
  });

  const tables = tablesData?.bookableTables ?? [];

  const [updateReservation] = useMutation(UPDATE_RESERVATION);

  function onSelectDate(next: string) {
    setDate(next);
    setSlotStart(null);
    setSelectedTableId(null);
  }

  function onPartySizeChange(size: number) {
    setPartySize(size);
    setSelectedTableId(null);
  }

  function onSelectSlot(time: string) {
    setSlotStart(time);
    setSelectedTableId(null);
  }

  function openConfirm() {
    if (!reservation || !slotStart) {
      toast.error("Select a time", {
        description: "Please pick an available time slot.",
      });
      return;
    }
    if (
      !hasEditChanges({
        reservation,
        partySize,
        slotStart,
        occasion,
        guestNotes,
        selectedTableId,
        allowGuestTableSelection,
      })
    ) {
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirmSave() {
    if (!reservation || !slotStart) return;
    if (
      !hasEditChanges({
        reservation,
        partySize,
        slotStart,
        occasion,
        guestNotes,
        selectedTableId,
        allowGuestTableSelection,
      })
    ) {
      setConfirmOpen(false);
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
            ...(allowGuestTableSelection && selectedTableId
              ? { tableId: selectedTableId }
              : {}),
          },
        },
        refetchQueries: [
          { query: MY_RESERVATIONS },
          { query: MY_RESERVATION, variables: { id: reservation.id } },
        ],
      });
      setConfirmOpen(false);
      toast.success("Reservation updated");
      router.back();
    } catch (err) {
      toast.error("Couldn't update", {
        description: getGraphQLErrorMessage(err, "Could not update"),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !reservation) {
    return (
      <Flex flex={1} justifyContent="center" alignItems="center">
        <Loader />
      </Flex>
    );
  }

  if (error || !reservation) {
    const needsAuth = !user || (Boolean(error) && isUnauthenticatedError(error));
    return (
      <Flex
        flex={1}
        justifyContent="center"
        style={[styles.centered, { paddingTop: insets.top }]}
      >
        {needsAuth ? (
          <Empty
            title="Sign in to edit this reservation"
            description="Sign in to your account to change booking details."
          >
            <Button
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: {
                    next: id ? `/reservations/${id}/edit` : "/reservations",
                  },
                })
              }
            >
              Sign in
            </Button>
            <Button variant="outlined" onPress={() => router.back()}>
              Go back
            </Button>
          </Empty>
        ) : (
          <Empty
            title="Reservation not found"
            description="It may have been removed or you no longer have access."
          >
            <Button onPress={() => router.back()}>Go back</Button>
          </Empty>
        )}
      </Flex>
    );
  }

  if (!initialized) {
    return (
      <Flex flex={1} justifyContent="center" alignItems="center">
        <Loader />
      </Flex>
    );
  }

  if (!canEditReservation(reservation)) {
    return (
      <Flex
        flex={1}
        justifyContent="center"
        style={[styles.centered, { paddingTop: insets.top }]}
      >
        <Empty
          title="Editing unavailable"
          description="This reservation can no longer be edited."
        >
          <Button onPress={() => router.back()}>Go back</Button>
        </Empty>
      </Flex>
    );
  }

  const dirty = hasEditChanges({
    reservation,
    partySize,
    slotStart,
    occasion,
    guestNotes,
    selectedTableId,
    allowGuestTableSelection,
  });
  const canSave = canProceedToDetails(slotStart, partySize) && dirty;
  const footerPad = theme.space(14);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
        <Flex alignItems="center" style={styles.titleBlock}>
          <Typography weight="semibold" size="text-lg">
            Edit reservation
          </Typography>
          <Typography size="text-sm" color="secondary" numberOfLines={1}>
            {reservation.restaurant?.name ?? "Restaurant"}
          </Typography>
        </Flex>
        <View style={styles.sideSlot} />
      </Flex>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + footerPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {restaurantLoading && !restaurant ? (
          <Flex alignItems="center" style={styles.loaderBlock}>
            <Loader />
          </Flex>
        ) : (
          <Flex gap={3} style={styles.stepContent}>
            <BookingQuickSelectors
              date={date}
              partySize={partySize}
              maxAdvanceDays={maxAdvanceDays}
              onDateChange={onSelectDate}
              onPartySizeChange={onPartySizeChange}
            />

            <BookingTimeSections
              slots={slots}
              selectedSlot={slotStart}
              loading={availabilityLoading}
              showEmpty={!availabilityLoading}
              shifts={restaurant?.shifts}
              date={date}
              onSelectSlot={onSelectSlot}
            />

            {allowGuestTableSelection ? (
              <BookingSection title="Your table">
                <BookingTablePicker
                  tables={tables}
                  selectedTableId={selectedTableId}
                  onSelectTable={setSelectedTableId}
                  loading={tablesLoading}
                />
              </BookingSection>
            ) : null}

            <BookingPreferencesSection
              occasion={occasion}
              notes={guestNotes}
              onOccasionChange={setOccasion}
              onNotesChange={setGuestNotes}
            />
          </Flex>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        <Button
          fullWidth
          size="xl"
          disabled={!canSave || saving}
          onPress={openConfirm}
        >
          Save changes
        </Button>
      </View>

      <ConfirmEditReservationSheet
        visible={confirmOpen}
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        onConfirm={() => void onConfirmSave()}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, shadows, radius }) => ({
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
    paddingBottom: space(2.5),
  },
  backBtn: {
    width: space(5),
    height: space(5),
    borderRadius: radius.full,
  },
  sideSlot: {
    width: space(5),
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: space(2),
  },
  stepContent: {
    flexGrow: 1,
    paddingBottom: space(2),
  },
  loaderBlock: {
    paddingVertical: space(6),
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
