import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon } from "@/assets";
import {
  Button,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  Typography,
} from "@/components";
import { MY_RESERVATIONS, useAuth } from "@/graphql";
import {
  getGraphQLErrorCode,
  getGraphQLErrorMessage,
  getValidationIssues,
  toFieldErrors,
} from "@/lib/graphql-errors";
import { useAppStore } from "@/store";
import {
  LOYALTY,
  RESTAURANT_LOYALTY,
} from "@reservations/shared";

import {
  BEST_PROMOTION,
  BOOKABLE_TABLES,
  BOOKING_AVAILABILITY,
  BOOKING_RESTAURANT,
  CONFIRM_DEPOSIT,
  CREATE_RESERVATION,
  EXPERIENCES,
  JOIN_WAITLIST,
  MY_RESTAURANT_LOYALTY_BALANCE,
  PRIVATE_DINING_SPACES,
  RESTAURANT_PACKAGES,
  VALIDATE_GIFT_CARD,
  VALIDATE_PROMOTION,
} from "./api/booking.operations";
import { BookingAddonsSection } from "./components/booking-addons-section.component";
import { BookingConfirmSheet } from "./components/booking-confirm-sheet.component";
import { BookingContactsCard } from "./components/booking-contacts-card.component";
import { BookingPreferencesSection } from "./components/booking-preferences-section.component";
import { BookingPromoRewardsSection } from "./components/booking-promo-rewards-section.component";
import { BookingQuickSelectors } from "./components/booking-quick-selectors.component";
import { BookingSectionCard } from "./components/booking-section-card.component";
import { BookingTablePicker } from "./components/booking-table-picker.component";
import { BookingTimeSections } from "./components/booking-time-sections.component";
import { BookingWaitlistChips } from "./components/booking-waitlist-chips.component";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "./helpers/booking-draft.helpers";
import {
  computeDepositBeforePromo,
  computeFinalDepositCents,
} from "./helpers/booking-pricing.helpers";
import {
  canProceedToDetails,
  filterExperiencesForDate,
  filterPackagesForParty,
  filterPrivateSpacesForParty,
  isSlotStillAvailable,
} from "./helpers/booking-validation.helpers";
import {
  clampBookingDate,
  findNearbyAvailableSlots,
  tomorrowIsoDate,
} from "./helpers/time-slots.helpers";
import {
  extractPaymentIntentId,
  useDepositPayment,
} from "./hooks/use-deposit-payment.hook";
import type {
  AvailabilitySlot,
  BookableExperience,
  BookablePackage,
  BookableTable,
  BookingStep,
  PrivateDiningSpace,
  RestaurantBookingInfo,
} from "./types";

export function BookingFeature() {
  const { id, resume } = useLocalSearchParams<{ id: string; resume?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);

  const [step, setStep] = useState<BookingStep>("datetime");
  const [date, setDate] = useState(() =>
    clampBookingDate(discovery.date || tomorrowIsoDate()),
  );
  const [partySize, setPartySize] = useState(discovery.partySize || 2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [occasion, setOccasion] = useState("none");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [redeemRestaurantPoints, setRedeemRestaurantPoints] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [selectedExperienceId, setSelectedExperienceId] = useState<
    string | null
  >(null);
  const [selectedPrivateSpaceId, setSelectedPrivateSpaceId] = useState<
    string | null
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotStaleMessage, setSlotStaleMessage] = useState<string | null>(null);
  const [nearbyReferenceTime, setNearbyReferenceTime] = useState<string | null>(
    null,
  );
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const isSubmittingRef = useRef(false);
  const draftRestoredRef = useRef(false);

  const { paying, payDeposit, clearError } = useDepositPayment();

  const {
    data: restaurantData,
    loading: restaurantLoading,
    error: restaurantError,
  } = useQuery<{ restaurant: RestaurantBookingInfo | null }>(
    BOOKING_RESTAURANT,
    {
      variables: { id },
      skip: !id,
    },
  );

  const restaurant = restaurantData?.restaurant;

  const {
    data: availabilityData,
    loading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery<{ availability: AvailabilitySlot[] }>(BOOKING_AVAILABILITY, {
    variables: { restaurantId: id, date, partySize },
    skip: !id || !restaurant?.reservationsVisible,
    fetchPolicy: "network-only",
  });

  const slots = availabilityData?.availability ?? [];
  const availableCount = slots.filter((s) => s.available).length;

  const { data: tablesData, loading: tablesLoading } = useQuery<{
    bookableTables: BookableTable[];
  }>(BOOKABLE_TABLES, {
    variables: {
      restaurantId: id,
      slotStart: selectedSlot,
      partySize,
    },
    skip:
      !id ||
      !selectedSlot ||
      !restaurant?.allowGuestTableSelection ||
      step !== "details",
    fetchPolicy: "network-only",
  });

  const { data: packagesData } = useQuery<{
    restaurantPackages: BookablePackage[];
  }>(RESTAURANT_PACKAGES, {
    variables: { restaurantId: id, activeOnly: true },
    skip: !id || step !== "details",
  });

  const { data: experiencesData } = useQuery<{
    experiences: { items: BookableExperience[] };
  }>(EXPERIENCES, {
    variables: { restaurantId: id, upcoming: true, limit: 20 },
    skip: !id || step !== "details",
  });

  const { data: privateSpacesData } = useQuery<{
    privateDiningSpaces: PrivateDiningSpace[];
  }>(PRIVATE_DINING_SPACES, {
    variables: { restaurantId: id },
    skip: !id || step !== "details",
  });

  const { data: restaurantLoyaltyData } = useQuery<{
    myRestaurantLoyaltyBalance: number;
  }>(MY_RESTAURANT_LOYALTY_BALANCE, {
    variables: { restaurantId: id },
    skip: !id || !user || step !== "details",
  });

  const packages = useMemo(
    () =>
      filterPackagesForParty(packagesData?.restaurantPackages ?? [], partySize),
    [packagesData, partySize],
  );

  const experiences = useMemo(
    () =>
      filterExperiencesForDate(
        experiencesData?.experiences?.items ?? [],
        date,
      ),
    [experiencesData, date],
  );

  const privateSpaces = useMemo(
    () =>
      filterPrivateSpacesForParty(
        privateSpacesData?.privateDiningSpaces ?? [],
        partySize,
      ),
    [privateSpacesData, partySize],
  );

  const selectedTable = tablesData?.bookableTables.find(
    (t) => t.id === selectedTableId,
  );

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const selectedExperience = experiences.find(
    (e) => e.id === selectedExperienceId,
  );
  const selectedPrivateSpace = privateSpaces.find(
    (s) => s.id === selectedPrivateSpaceId,
  );

  const restaurantMinRedeem =
    restaurant?.loyaltyMinRedeemPoints ??
    RESTAURANT_LOYALTY.DEFAULT_MIN_REDEEM_POINTS;
  const restaurantLoyaltyBalance =
    restaurantLoyaltyData?.myRestaurantLoyaltyBalance ?? 0;

  const pricingInput = useMemo(
    () => ({
      restaurant: restaurant!,
      partySize,
      selectedTable,
      selectedPackage,
      selectedPrivateSpace,
      selectedExperience,
      redeemPoints,
      redeemRestaurantPoints,
      restaurantLoyaltyBalance,
    }),
    [
      restaurant,
      partySize,
      selectedTable,
      selectedPackage,
      selectedPrivateSpace,
      selectedExperience,
      redeemPoints,
      redeemRestaurantPoints,
      restaurantLoyaltyBalance,
    ],
  );

  const depositBeforePromo = restaurant
    ? computeDepositBeforePromo(pricingInput)
    : 0;

  const { data: promoValidationData } = useQuery(VALIDATE_PROMOTION, {
    variables: {
      restaurantId: id,
      code: promoCode.trim().toUpperCase(),
      slotStart: selectedSlot,
      depositCents: depositBeforePromo,
    },
    skip:
      !id ||
      !promoCode.trim() ||
      !selectedSlot ||
      depositBeforePromo <= 0 ||
      step !== "details",
  });

  const { data: bestPromoData } = useQuery(BEST_PROMOTION, {
    variables: {
      restaurantId: id,
      slotStart: selectedSlot,
      depositCents: depositBeforePromo,
    },
    skip:
      !id ||
      !!promoCode.trim() ||
      !selectedSlot ||
      depositBeforePromo <= 0 ||
      step !== "details",
  });

  const promoValidation = (promoValidationData as { validatePromotion?: { valid: boolean; message?: string; discountCents: number } })?.validatePromotion;
  const bestPromotion = (bestPromoData as { bestPromotion?: { valid: boolean; message?: string; discountCents: number } })?.bestPromotion;
  const activePromo = promoCode.trim() ? promoValidation : bestPromotion;

  const depositAfterPromo = Math.max(
    0,
    depositBeforePromo - (activePromo?.valid ? activePromo.discountCents : 0),
  );

  const { data: giftValidationData } = useQuery(VALIDATE_GIFT_CARD, {
    variables: {
      restaurantId: id,
      code: giftCardCode.trim().toUpperCase(),
      depositCents: depositAfterPromo,
    },
    skip:
      !id ||
      !giftCardCode.trim() ||
      depositAfterPromo <= 0 ||
      step !== "details",
  });

  const giftValidation = (giftValidationData as { validateGiftCard?: { valid: boolean; message?: string; discountCents: number } })?.validateGiftCard;

  const finalDepositCents = restaurant
    ? computeFinalDepositCents({
        ...pricingInput,
        activePromo: activePromo ?? null,
        giftValidation: giftValidation ?? null,
      })
    : 0;

  const nearbySlots = useMemo(() => {
    if (!nearbyReferenceTime) return [];
    return findNearbyAvailableSlots(slots, nearbyReferenceTime);
  }, [slots, nearbyReferenceTime]);

  const [createReservation, { loading: creating }] =
    useMutation(CREATE_RESERVATION);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [joinWaitlist] = useMutation(JOIN_WAITLIST);

  useEffect(() => {
    const clamped = clampBookingDate(discovery.date || tomorrowIsoDate());
    if (clamped !== discovery.date) {
      setDiscovery({ date: clamped });
    }
  }, [discovery.date, setDiscovery]);

  useEffect(() => {
    if (!id || draftRestoredRef.current || resume !== "1") return;
    const draft = loadBookingDraft(id);
    if (!draft) return;
    draftRestoredRef.current = true;
    setDate(clampBookingDate(draft.date));
    setPartySize(draft.partySize);
    if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
    setOccasion(draft.occasion);
    setNotes(draft.notes);
    setPromoCode(draft.promoCode);
    setGiftCardCode(draft.giftCardCode);
    setRedeemPoints(draft.redeemPoints);
    setRedeemRestaurantPoints(draft.redeemRestaurantPoints);
    if (draft.selectedTableId) setSelectedTableId(draft.selectedTableId);
    if (draft.selectedSlot) setStep("details");
  }, [id, resume]);

  useEffect(() => {
    if (availabilityLoading || !selectedSlot) return;
    if (!isSlotStillAvailable(slots, selectedSlot)) {
      setSelectedSlot(null);
      setSelectedTableId(null);
      setSlotStaleMessage("That time is no longer available — pick another slot.");
    }
  }, [availabilityLoading, slots, selectedSlot]);

  useEffect(() => {
    setSelectedTableId(null);
  }, [selectedSlot, partySize]);

  const persistDraft = useCallback(() => {
    if (!id) return;
    saveBookingDraft({
      restaurantId: id,
      date,
      partySize,
      selectedSlot,
      selectedTableId,
      occasion,
      notes,
      promoCode,
      giftCardCode,
      redeemPoints,
      redeemRestaurantPoints,
    });
  }, [
    id,
    date,
    partySize,
    selectedSlot,
    selectedTableId,
    occasion,
    notes,
    promoCode,
    giftCardCode,
    redeemPoints,
    redeemRestaurantPoints,
  ]);

  function onSelectDate(iso: string) {
    setDate(iso);
    setSelectedSlot(null);
    setNearbyReferenceTime(null);
    setSlotStaleMessage(null);
  }

  function onPartySizeChange(size: number) {
    setPartySize(size);
    setSelectedSlot(null);
    setNearbyReferenceTime(null);
    setSlotStaleMessage(null);
  }

  function goBack() {
    if (step === "details") {
      setStep("datetime");
      return;
    }
    router.back();
  }

  function onContinueFromDateTime() {
    if (!canProceedToDetails(selectedSlot, partySize)) {
      Alert.alert("Select a time", "Please choose an available time slot.");
      return;
    }
    setStep("details");
  }

  function openConfirm() {
    if (!user) {
      persistDraft();
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${id}/book?resume=1` },
      });
      return;
    }
    if (!selectedSlot || !isSlotStillAvailable(slots, selectedSlot)) {
      Alert.alert(
        "Time unavailable",
        "That time is no longer available. Please pick another slot.",
      );
      setStep("datetime");
      setSelectedSlot(null);
      return;
    }
    setSubmitError(null);
    setConfirmOpen(true);
  }

  async function submitBooking() {
    if (!user || !selectedSlot || !restaurant || !id) return;
    if (isSubmittingRef.current) return;
    if (!termsAccepted) return;

    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      const { data: freshAvail } = await refetchAvailability();
      const freshSlots = freshAvail?.availability ?? [];
      if (!isSlotStillAvailable(freshSlots, selectedSlot)) {
        setConfirmOpen(false);
        setStep("datetime");
        setSelectedSlot(null);
        setSubmitError("That time is no longer available — pick another slot.");
        return;
      }

      const canRedeemRestaurant =
        restaurant.loyaltyEnabled &&
        restaurantLoyaltyBalance >= restaurantMinRedeem;

      const { data: result } = await createReservation({
        variables: {
          input: {
            restaurantId: id,
            partySize,
            slotStart: selectedSlot,
            occasion,
            guestNotes: notes.trim() || undefined,
            ...(redeemPoints >= LOYALTY.MIN_REDEEM_POINTS ? { redeemPoints } : {}),
            ...(canRedeemRestaurant &&
            redeemRestaurantPoints >= restaurantMinRedeem
              ? { redeemRestaurantPoints }
              : {}),
            ...(promoCode.trim()
              ? { promoCode: promoCode.trim().toUpperCase() }
              : {}),
            ...(giftCardCode.trim()
              ? { giftCardCode: giftCardCode.trim().toUpperCase() }
              : {}),
            ...(selectedTableId ? { tableId: selectedTableId } : {}),
            ...(selectedPackageId ? { packageId: selectedPackageId } : {}),
            ...(selectedPrivateSpaceId
              ? { privateDiningSpaceId: selectedPrivateSpaceId }
              : {}),
            ...(selectedExperienceId
              ? { experienceId: selectedExperienceId }
              : {}),
          },
        },
        refetchQueries: [{ query: MY_RESERVATIONS }],
      });

      const payload = result?.createReservation;
      const reservation = payload?.reservation;
      if (!reservation?.id) {
        throw new Error("Booking failed");
      }

      clearBookingDraft(id);
      setConfirmOpen(false);

      if (payload.clientSecret) {
        clearError();
        const paid = await payDeposit({
          clientSecret: payload.clientSecret,
          merchantName: restaurant.name,
        });
        if (!paid) {
          setSubmitError("Payment was not completed. You can pay from your reservations.");
          router.push({
            pathname: "/reservations/[id]",
            params: { id: reservation.id },
          });
          return;
        }

        const paymentIntentId = extractPaymentIntentId(payload.clientSecret);
        try {
          await confirmDeposit({ variables: { paymentIntentId } });
        } catch {
          // webhook may reconcile
        }
      }

      router.replace({
        pathname: "/booking/confirmation",
        params: { reservationId: reservation.id },
      });
    } catch (err) {
      const issues = getValidationIssues(err);
      if (issues.length > 0) {
        const fieldErrors = toFieldErrors(issues);
        setSubmitError(
          Object.values(fieldErrors)[0] ??
            "Please fix the highlighted fields and try again.",
        );
        return;
      }
      const code = getGraphQLErrorCode(err);
      if (code === "CONFLICT") {
        setConfirmOpen(false);
        setStep("datetime");
        setSelectedSlot(null);
      }
      setSubmitError(getGraphQLErrorMessage(err, "Booking failed"));
    } finally {
      isSubmittingRef.current = false;
    }
  }

  async function onJoinWaitlist() {
    if (!user) {
      persistDraft();
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${id}/book?resume=1` },
      });
      return;
    }
    if (!id) return;
    setWaitlistLoading(true);
    try {
      const { data } = await joinWaitlist({
        variables: {
          input: {
            restaurantId: id,
            partySize,
            preferredDate: date,
          },
        },
      });
      const entry = data?.joinWaitlist;
      const eta =
        entry?.position != null && entry?.estimatedWaitMinutes != null
          ? ` You are #${entry.position} · ~${entry.estimatedWaitMinutes} min wait.`
          : "";
      Alert.alert("Waitlist", `Added to waitlist.${eta}`);
    } catch (err) {
      Alert.alert("Waitlist", getGraphQLErrorMessage(err, "Could not join waitlist"));
    } finally {
      setWaitlistLoading(false);
    }
  }

  if (restaurantLoading && !restaurant) {
    return (
      <Flex flex={1} justifyContent="center" alignItems="center">
        <Loader />
      </Flex>
    );
  }

  if (restaurantError || !restaurant) {
    return (
      <Flex flex={1} justifyContent="center" style={styles.centered}>
        <InlineAlert
          tone="error"
          message={restaurantError?.message ?? "Restaurant not found"}
        />
        <Button onPress={() => router.back()}>Go back</Button>
      </Flex>
    );
  }

  if (restaurant.reservationsVisible === false) {
    return (
      <Flex flex={1} justifyContent="center" style={styles.centered}>
        <Typography weight="semibold" align="center">
          Contact restaurant to reserve
        </Typography>
        <Typography color="secondary" align="center">
          Online booking is not available for this restaurant.
        </Typography>
        <Button onPress={() => router.back()}>Go back</Button>
      </Flex>
    );
  }

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Guest";
  const continueLabel = restaurant.allowGuestTableSelection
    ? "Choose table"
    : "Continue";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Flex direction="row" alignItems="center" style={styles.topBar}>
        <IconButton
          icon={<ChevronLeftIcon />}
          variant="surface"
          size="sm"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={styles.backBtn}
        />
        <Flex alignItems="center" style={styles.titleBlock}>
          <Typography weight="semibold" size="text-lg">
            Book a table
          </Typography>
          <Typography size="text-sm" color="secondary" numberOfLines={1}>
            {restaurant.name}
          </Typography>
        </Flex>
        <View style={styles.sideSlot} />
      </Flex>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + theme.space(10) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {slotStaleMessage ? (
          <InlineAlert
            tone="warning"
            message={slotStaleMessage}
            onDismiss={() => setSlotStaleMessage(null)}
            style={styles.alert}
          />
        ) : null}

        {step === "datetime" ? (
          <Flex gap={2} style={styles.stepContent}>
            <BookingQuickSelectors
              date={date}
              partySize={partySize}
              onDateChange={onSelectDate}
              onPartySizeChange={onPartySizeChange}
            />

            <BookingTimeSections
              slots={slots}
              selectedSlot={selectedSlot}
              loading={availabilityLoading}
              showEmpty={!availabilityLoading}
              onSelectSlot={(time) => {
                setSelectedSlot(time);
                setSlotStaleMessage(null);
                setNearbyReferenceTime(null);
              }}
              onUnavailablePress={(time) => setNearbyReferenceTime(time)}
            />

            {!availabilityLoading &&
            (nearbySlots.length > 0 || availableCount === 0) ? (
              <BookingSectionCard>
                <BookingWaitlistChips
                  nearbySlots={nearbySlots}
                  onSelectSlot={(time) => {
                    setSelectedSlot(time);
                    setNearbyReferenceTime(null);
                  }}
                  onJoinWaitlist={onJoinWaitlist}
                  waitlistLoading={waitlistLoading}
                  showWaitlist={availableCount === 0}
                />
              </BookingSectionCard>
            ) : null}
          </Flex>
        ) : (
          <Flex gap={2} style={styles.stepContent}>
            {restaurant.allowGuestTableSelection ? (
              <BookingSectionCard title="Your table">
                <BookingTablePicker
                  tables={tablesData?.bookableTables ?? []}
                  selectedTableId={selectedTableId}
                  onSelectTable={setSelectedTableId}
                  loading={tablesLoading}
                />
              </BookingSectionCard>
            ) : (
              <BookingSectionCard title="Your table">
                <InlineAlert
                  tone="info"
                  message="Your table will be assigned automatically."
                />
              </BookingSectionCard>
            )}

            {packages.length > 0 ||
            experiences.length > 0 ||
            privateSpaces.length > 0 ? (
              <BookingSectionCard title="Add-ons">
                <BookingAddonsSection
                  packages={packages}
                  experiences={experiences}
                  privateSpaces={privateSpaces}
                  selectedPackageId={selectedPackageId}
                  selectedExperienceId={selectedExperienceId}
                  selectedPrivateSpaceId={selectedPrivateSpaceId}
                  onSelectPackage={setSelectedPackageId}
                  onSelectExperience={setSelectedExperienceId}
                  onSelectPrivateSpace={setSelectedPrivateSpaceId}
                />
              </BookingSectionCard>
            ) : null}

            <BookingPreferencesSection
              occasion={occasion}
              notes={notes}
              onOccasionChange={setOccasion}
              onNotesChange={setNotes}
            />

            <BookingPromoRewardsSection
              promoCode={promoCode}
              giftCardCode={giftCardCode}
              redeemPoints={redeemPoints}
              redeemRestaurantPoints={redeemRestaurantPoints}
              platformPoints={user?.loyaltyPoints ?? 0}
              restaurantLoyaltyBalance={restaurantLoyaltyBalance}
              restaurantLoyaltyEnabled={!!restaurant.loyaltyEnabled}
              restaurantMinRedeem={restaurantMinRedeem}
              finalDepositCents={finalDepositCents}
              promoMessage={activePromo?.message}
              promoValid={activePromo?.valid}
              giftMessage={giftValidation?.message}
              giftValid={giftValidation?.valid}
              onPromoCodeChange={setPromoCode}
              onGiftCardCodeChange={setGiftCardCode}
              onRedeemPointsChange={setRedeemPoints}
              onRedeemRestaurantPointsChange={setRedeemRestaurantPoints}
            />

            <BookingContactsCard
              userName={userName}
              userEmail={user?.email ?? ""}
              isSignedIn={!!user}
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
        {step === "datetime" ? (
          <Button
            fullWidth
            size="xl"
            disabled={!canProceedToDetails(selectedSlot, partySize)}
            onPress={onContinueFromDateTime}
          >
            {continueLabel}
          </Button>
        ) : (
          <Button fullWidth size="xl" onPress={openConfirm}>
            Review booking
          </Button>
        )}
      </View>

      <BookingConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitBooking}
        loading={creating || paying}
        userName={userName}
        userEmail={user?.email ?? ""}
        slotStart={selectedSlot ?? ""}
        partySize={partySize}
        occasion={occasion}
        tableName={selectedTable?.name}
        depositCents={finalDepositCents}
        termsAccepted={termsAccepted}
        onTermsAcceptedChange={setTermsAccepted}
        errorMessage={submitError}
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
    paddingBottom: space(2),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },
  sideSlot: {
    width: 40,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: space(1.5),
  },
  stepContent: {
    flexGrow: 1,
    paddingBottom: space(1),
  },
  alert: {
    marginHorizontal: space(2),
    marginBottom: space(1),
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    ...shadows.stickyFooter,
  },
}));
