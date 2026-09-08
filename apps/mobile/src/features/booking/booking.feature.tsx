import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
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
import { useAuth } from "@/graphql";
import { tomorrowIsoDate } from "@/lib/helpers/date-time.helpers";
import { useAppStore } from "@/store";

import { BookingConfirmSheet } from "./components/booking-confirm-sheet.component";
import { BookingDatetimeStep } from "./components/booking-datetime-step.component";
import { BookingDetailsStep } from "./components/booking-details-step.component";
import { BookingWaitlistSuccessModal } from "./components/booking-waitlist-success-modal.component";
import { saveBookingDraft } from "./helpers/booking-draft.helpers";
import { formatCents } from "./helpers/booking-pricing.helpers";
import { canProceedToDetails } from "./helpers/booking-validation.helpers";
import {
  clampBookingDate,
  findNearbyAvailableSlots,
} from "./helpers/time-slots.helpers";
import { useBookingData } from "./hooks/use-booking-data.hook";
import {
  useBookingFormState,
  useBookingSelectionSync,
} from "./hooks/use-booking-form-state.hook";
import { useBookingPricing } from "./hooks/use-booking-pricing.hook";
import { useBookingSubmit } from "./hooks/use-booking-submit.hook";
import { useBookingWaitlist } from "./hooks/use-booking-waitlist.hook";

export function BookingFeature() {
  const { id, resume } = useLocalSearchParams<{ id: string; resume?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { user } = useAuth();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);

  const form = useBookingFormState({
    restaurantId: id,
    resume,
    initialDate: discovery.date || tomorrowIsoDate(),
    initialPartySize: discovery.partySize || 2,
  });

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Guest";

  const {
    restaurant,
    restaurantLoading,
    restaurantError,
    slots,
    availableCount,
    availabilityLoading,
    refetchAvailability,
    tables,
    tablesLoading,
    packages,
    experiences,
    privateSpaces,
    restaurantLoyaltyBalance,
    maxBookablePartySize,
    partyTooLarge,
    isOnWaitlist,
    refetchMyWaitlist,
  } = useBookingData({
    restaurantId: id,
    date: form.date,
    partySize: form.partySize,
    selectedSlot: form.selectedSlot,
    step: form.step,
    userId: user?.id,
  });

  useBookingSelectionSync({
    availabilityLoading,
    slots,
    packages,
    experiences,
    privateSpaces,
    tables,
    selectedSlot: form.selectedSlot,
    selectedTableId: form.selectedTableId,
    selectedPackageId: form.selectedPackageId,
    selectedExperienceId: form.selectedExperienceId,
    selectedPrivateSpaceId: form.selectedPrivateSpaceId,
    setSelectedSlot: form.setSelectedSlot,
    setSelectedTableId: form.setSelectedTableId,
    setSelectedPackageId: form.setSelectedPackageId,
    setSelectedExperienceId: form.setSelectedExperienceId,
    setSelectedPrivateSpaceId: form.setSelectedPrivateSpaceId,
    setSlotStaleMessage: form.setSlotStaleMessage,
  });

  const selectedTable = tables.find((t) => t.id === form.selectedTableId);
  const selectedPackage = packages.find((p) => p.id === form.selectedPackageId);
  const selectedExperience = experiences.find(
    (e) => e.id === form.selectedExperienceId,
  );
  const selectedPrivateSpace = privateSpaces.find(
    (s) => s.id === form.selectedPrivateSpaceId,
  );

  const {
    restaurantMinRedeem,
    finalDepositCents,
    depositBreakdown,
    activePromo,
    giftValidation,
  } = useBookingPricing({
    restaurantId: id,
    restaurant,
    step: form.step,
    partySize: form.partySize,
    selectedSlot: form.selectedSlot,
    promoCode: form.promoCode,
    giftCardCode: form.giftCardCode,
    redeemPoints: form.redeemPoints,
    redeemRestaurantPoints: form.redeemRestaurantPoints,
    restaurantLoyaltyBalance,
    selectedTable,
    selectedPackage,
    selectedPrivateSpace,
    selectedExperience,
  });

  const nearbySlots = useMemo(() => {
    if (!form.nearbyReferenceTime) return [];
    return findNearbyAvailableSlots(slots, form.nearbyReferenceTime);
  }, [slots, form.nearbyReferenceTime]);

  const persistDraft = useCallback(() => {
    if (!id) return;
    saveBookingDraft({
      restaurantId: id,
      date: form.date,
      partySize: form.partySize,
      selectedSlot: form.selectedSlot,
      selectedTableId: form.selectedTableId,
      occasion: form.occasion,
      notes: form.notes,
      promoCode: form.promoCode,
      giftCardCode: form.giftCardCode,
      redeemPoints: form.redeemPoints,
      redeemRestaurantPoints: form.redeemRestaurantPoints,
    });
  }, [
    id,
    form.date,
    form.partySize,
    form.selectedSlot,
    form.selectedTableId,
    form.occasion,
    form.notes,
    form.promoCode,
    form.giftCardCode,
    form.redeemPoints,
    form.redeemRestaurantPoints,
  ]);

  const {
    confirmOpen,
    setConfirmOpen,
    submitError,
    creating,
    paying,
    openConfirm,
    submitBooking,
  } = useBookingSubmit({
    restaurantId: id,
    restaurant,
    user,
    selectedSlot: form.selectedSlot,
    partySize: form.partySize,
    occasion: form.occasion,
    notes: form.notes,
    promoCode: form.promoCode,
    giftCardCode: form.giftCardCode,
    redeemPoints: form.redeemPoints,
    redeemRestaurantPoints: form.redeemRestaurantPoints,
    restaurantLoyaltyBalance,
    restaurantMinRedeem,
    selectedTableId: form.selectedTableId,
    selectedPackageId: form.selectedPackageId,
    selectedPrivateSpaceId: form.selectedPrivateSpaceId,
    selectedExperienceId: form.selectedExperienceId,
    termsAccepted: form.termsAccepted,
    slots,
    refetchAvailability,
    persistDraft,
    onSlotBecameUnavailable: form.onSlotBecameUnavailable,
  });

  const {
    waitlistLoading,
    waitlistSuccess,
    dismissWaitlistSuccess,
    onJoinWaitlist,
  } = useBookingWaitlist({
    restaurantId: id,
    user,
    partySize: form.partySize,
    date: form.date,
    persistDraft,
    refetchMyWaitlist,
  });

  useEffect(() => {
    const clamped = clampBookingDate(discovery.date || tomorrowIsoDate());
    if (clamped !== discovery.date) {
      setDiscovery({ date: clamped });
    }
  }, [discovery.date, setDiscovery]);

  function goBack() {
    if (form.goBackFromDetails()) return;
    router.back();
  }

  function onContinueFromDateTime() {
    if (!canProceedToDetails(form.selectedSlot, form.partySize)) {
      Alert.alert("Select a time", "Please choose an available time slot.");
      return;
    }
    form.onContinueFromDateTime();
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

  const continueLabel = restaurant.allowGuestTableSelection
    ? "Choose table"
    : "Continue";

  const hasJoinedWaitlist = isOnWaitlist || waitlistSuccess != null;

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
          { paddingBottom: insets.bottom + theme.space(form.step === "details" && finalDepositCents > 0 ? 14 : 10) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {form.slotStaleMessage ? (
          <InlineAlert
            tone="warning"
            message={form.slotStaleMessage}
            onDismiss={() => form.setSlotStaleMessage(null)}
            style={styles.alert}
          />
        ) : null}

        {form.step === "datetime" ? (
          <BookingDatetimeStep
            date={form.date}
            partySize={form.partySize}
            slots={slots}
            selectedSlot={form.selectedSlot}
            availabilityLoading={availabilityLoading}
            nearbySlots={nearbySlots}
            availableCount={availableCount}
            waitlistLoading={waitlistLoading}
            isOnWaitlist={hasJoinedWaitlist}
            shifts={restaurant.shifts}
            partyTooLarge={partyTooLarge}
            maxBookablePartySize={maxBookablePartySize}
            restaurantPhone={restaurant.phone}
            onDateChange={form.onSelectDate}
            onPartySizeChange={form.onPartySizeChange}
            onSelectSlot={form.onSelectSlot}
            onUnavailablePress={form.setNearbyReferenceTime}
            onJoinWaitlist={onJoinWaitlist}
            onSelectNearbySlot={form.onSelectNearbySlot}
          />
        ) : (
          <BookingDetailsStep
            allowGuestTableSelection={restaurant.allowGuestTableSelection}
            tables={tables}
            selectedTableId={form.selectedTableId}
            tablesLoading={tablesLoading}
            onSelectTable={form.setSelectedTableId}
            packages={packages}
            experiences={experiences}
            privateSpaces={privateSpaces}
            selectedPackageId={form.selectedPackageId}
            selectedExperienceId={form.selectedExperienceId}
            selectedPrivateSpaceId={form.selectedPrivateSpaceId}
            onSelectPackage={form.setSelectedPackageId}
            onSelectExperience={form.setSelectedExperienceId}
            onSelectPrivateSpace={form.setSelectedPrivateSpaceId}
            occasion={form.occasion}
            notes={form.notes}
            onOccasionChange={form.setOccasion}
            onNotesChange={form.setNotes}
            promoCode={form.promoCode}
            giftCardCode={form.giftCardCode}
            redeemPoints={form.redeemPoints}
            redeemRestaurantPoints={form.redeemRestaurantPoints}
            platformPoints={user?.loyaltyPoints ?? 0}
            restaurantLoyaltyBalance={restaurantLoyaltyBalance}
            restaurantLoyaltyEnabled={!!restaurant.loyaltyEnabled}
            restaurantMinRedeem={restaurantMinRedeem}
            depositBreakdown={depositBreakdown}
            promoMessage={activePromo?.message}
            promoValid={activePromo?.valid ?? undefined}
            giftMessage={giftValidation?.message}
            giftValid={giftValidation?.valid ?? undefined}
            onPromoCodeChange={form.setPromoCode}
            onGiftCardCodeChange={form.setGiftCardCode}
            onRedeemPointsChange={form.setRedeemPoints}
            onRedeemRestaurantPointsChange={form.setRedeemRestaurantPoints}
          />
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.space(2)) },
        ]}
      >
        {form.step === "datetime" ? (
          <Button
            fullWidth
            size="xl"
            disabled={!canProceedToDetails(form.selectedSlot, form.partySize)}
            onPress={onContinueFromDateTime}
          >
            {continueLabel}
          </Button>
        ) : (
          <Flex gap={1.5}>
            {finalDepositCents > 0 ? (
              <Flex
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography size="text-sm" color="secondary">
                  Deposit due
                </Typography>
                <Typography size="text-md" weight="bold">
                  {formatCents(finalDepositCents)}
                </Typography>
              </Flex>
            ) : null}
            <Button fullWidth size="xl" onPress={openConfirm}>
              Review booking
            </Button>
          </Flex>
        )}
      </View>

      <BookingConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitBooking}
        loading={creating || paying}
        userName={userName}
        slotStart={form.selectedSlot ?? ""}
        partySize={form.partySize}
        occasion={form.occasion}
        notes={form.notes}
        tableName={selectedTable?.name}
        depositCents={finalDepositCents}
        termsAccepted={form.termsAccepted}
        onTermsAcceptedChange={form.setTermsAccepted}
        errorMessage={submitError}
      />

      <BookingWaitlistSuccessModal
        visible={waitlistSuccess != null}
        onClose={dismissWaitlistSuccess}
        position={waitlistSuccess?.position}
        estimatedWaitMinutes={waitlistSuccess?.estimatedWaitMinutes}
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
  scroll: {
    flexGrow: 1,
    paddingTop: space(2),
  },
  alert: {
    marginHorizontal: space(2),
    marginBottom: space(1.5),
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
