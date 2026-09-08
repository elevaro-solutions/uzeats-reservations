import { useCallback, useEffect, useRef, useState } from "react";
import { OCCASIONS, type Occasion } from "@reservations/shared";

import { tomorrowIsoDate } from "@/lib/helpers/date-time.helpers";

import { loadBookingDraft } from "../helpers/booking-draft.helpers";
import { isSlotStillAvailable } from "../helpers/booking-validation.helpers";
import { clampBookingDate } from "../helpers/time-slots.helpers";
import type { AvailabilitySlot, BookingStep } from "../types";

function parseOccasion(value: string): Occasion {
  return (OCCASIONS as readonly string[]).includes(value)
    ? (value as Occasion)
    : "none";
}

export type UseBookingFormStateParams = {
  restaurantId: string | undefined;
  resume?: string;
  initialDate: string;
  initialPartySize: number;
};

export type UseBookingFormStateResult = {
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  date: string;
  setDate: (date: string) => void;
  partySize: number;
  setPartySize: (size: number) => void;
  selectedSlot: string | null;
  setSelectedSlot: (slot: string | null) => void;
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  occasion: Occasion;
  setOccasion: (occasion: Occasion) => void;
  notes: string;
  setNotes: (notes: string) => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  giftCardCode: string;
  setGiftCardCode: (code: string) => void;
  redeemPoints: number;
  setRedeemPoints: (points: number) => void;
  redeemRestaurantPoints: number;
  setRedeemRestaurantPoints: (points: number) => void;
  selectedPackageId: string | null;
  setSelectedPackageId: (id: string | null) => void;
  selectedExperienceId: string | null;
  setSelectedExperienceId: (id: string | null) => void;
  selectedPrivateSpaceId: string | null;
  setSelectedPrivateSpaceId: (id: string | null) => void;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  slotStaleMessage: string | null;
  setSlotStaleMessage: (message: string | null) => void;
  nearbyReferenceTime: string | null;
  setNearbyReferenceTime: (time: string | null) => void;
  onSelectDate: (iso: string) => void;
  onPartySizeChange: (size: number) => void;
  onSelectSlot: (time: string) => void;
  onSelectNearbySlot: (time: string) => void;
  onContinueFromDateTime: () => boolean;
  onSlotBecameUnavailable: () => void;
  goBackFromDetails: () => boolean;
};

export function useBookingFormState({
  restaurantId,
  resume,
  initialDate,
  initialPartySize,
}: UseBookingFormStateParams): UseBookingFormStateResult {
  const [step, setStep] = useState<BookingStep>("datetime");
  const [date, setDate] = useState(() =>
    clampBookingDate(initialDate || tomorrowIsoDate()),
  );
  const [partySize, setPartySize] = useState(initialPartySize || 2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<Occasion>("none");
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [slotStaleMessage, setSlotStaleMessage] = useState<string | null>(null);
  const [nearbyReferenceTime, setNearbyReferenceTime] = useState<string | null>(
    null,
  );

  const draftRestoredRef = useRef(false);
  const prevSlotPartyRef = useRef<{ slot: string | null; party: number } | null>(
    null,
  );

  useEffect(() => {
    if (!restaurantId || draftRestoredRef.current || resume !== "1") return;
    const draft = loadBookingDraft(restaurantId);
    if (!draft) return;
    draftRestoredRef.current = true;
    setDate(clampBookingDate(draft.date));
    setPartySize(draft.partySize);
    if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
    setOccasion(parseOccasion(draft.occasion));
    setNotes(draft.notes);
    setPromoCode(draft.promoCode);
    setGiftCardCode(draft.giftCardCode);
    setRedeemPoints(draft.redeemPoints);
    setRedeemRestaurantPoints(draft.redeemRestaurantPoints);
    if (draft.selectedTableId) setSelectedTableId(draft.selectedTableId);
    if (draft.selectedPackageId) setSelectedPackageId(draft.selectedPackageId);
    if (draft.selectedExperienceId) {
      setSelectedExperienceId(draft.selectedExperienceId);
    }
    if (draft.selectedPrivateSpaceId) {
      setSelectedPrivateSpaceId(draft.selectedPrivateSpaceId);
    }
    prevSlotPartyRef.current = {
      slot: draft.selectedSlot,
      party: draft.partySize,
    };
    if (draft.selectedSlot) setStep("details");
  }, [restaurantId, resume]);

  useEffect(() => {
    if (prevSlotPartyRef.current === null) {
      prevSlotPartyRef.current = { slot: selectedSlot, party: partySize };
      return;
    }
    if (
      prevSlotPartyRef.current.slot !== selectedSlot ||
      prevSlotPartyRef.current.party !== partySize
    ) {
      setSelectedTableId(null);
      prevSlotPartyRef.current = { slot: selectedSlot, party: partySize };
    }
  }, [selectedSlot, partySize]);

  const onSelectDate = useCallback((iso: string) => {
    setDate(iso);
    setSelectedSlot(null);
    setNearbyReferenceTime(null);
    setSlotStaleMessage(null);
  }, []);

  const onPartySizeChange = useCallback((size: number) => {
    setPartySize(size);
    setSelectedSlot(null);
    setNearbyReferenceTime(null);
    setSlotStaleMessage(null);
  }, []);

  const onSelectSlot = useCallback((time: string) => {
    setSelectedSlot(time);
    setSlotStaleMessage(null);
    setNearbyReferenceTime(null);
  }, []);

  const onSelectNearbySlot = useCallback((time: string) => {
    setSelectedSlot(time);
    setNearbyReferenceTime(null);
    setSlotStaleMessage(null);
  }, []);

  const onContinueFromDateTime = useCallback(() => {
    setStep("details");
    return true;
  }, []);

  const onSlotBecameUnavailable = useCallback(() => {
    setStep("datetime");
    setSelectedSlot(null);
  }, []);

  const goBackFromDetails = useCallback(() => {
    if (step === "details") {
      setStep("datetime");
      return true;
    }
    return false;
  }, [step]);

  return {
    step,
    setStep,
    date,
    setDate,
    partySize,
    setPartySize,
    selectedSlot,
    setSelectedSlot,
    selectedTableId,
    setSelectedTableId,
    occasion,
    setOccasion,
    notes,
    setNotes,
    promoCode,
    setPromoCode,
    giftCardCode,
    setGiftCardCode,
    redeemPoints,
    setRedeemPoints,
    redeemRestaurantPoints,
    setRedeemRestaurantPoints,
    selectedPackageId,
    setSelectedPackageId,
    selectedExperienceId,
    setSelectedExperienceId,
    selectedPrivateSpaceId,
    setSelectedPrivateSpaceId,
    termsAccepted,
    setTermsAccepted,
    slotStaleMessage,
    setSlotStaleMessage,
    nearbyReferenceTime,
    setNearbyReferenceTime,
    onSelectDate,
    onPartySizeChange,
    onSelectSlot,
    onSelectNearbySlot,
    onContinueFromDateTime,
    onSlotBecameUnavailable,
    goBackFromDetails,
  };
}

type IdItem = { id: string };

export type UseBookingSelectionSyncParams = {
  availabilityLoading: boolean;
  slots: AvailabilitySlot[];
  packages: IdItem[];
  experiences: IdItem[];
  privateSpaces: IdItem[];
  tables: IdItem[];
  selectedSlot: string | null;
  selectedTableId: string | null;
  selectedPackageId: string | null;
  selectedExperienceId: string | null;
  selectedPrivateSpaceId: string | null;
  setSelectedSlot: (slot: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedPackageId: (id: string | null) => void;
  setSelectedExperienceId: (id: string | null) => void;
  setSelectedPrivateSpaceId: (id: string | null) => void;
  setSlotStaleMessage: (message: string | null) => void;
};

/** Keep selections valid against filtered availability / addon lists. */
export function useBookingSelectionSync({
  availabilityLoading,
  slots,
  packages,
  experiences,
  privateSpaces,
  tables,
  selectedSlot,
  selectedTableId,
  selectedPackageId,
  selectedExperienceId,
  selectedPrivateSpaceId,
  setSelectedSlot,
  setSelectedTableId,
  setSelectedPackageId,
  setSelectedExperienceId,
  setSelectedPrivateSpaceId,
  setSlotStaleMessage,
}: UseBookingSelectionSyncParams): void {
  useEffect(() => {
    // Don't wipe selection while availability is loading or the list is empty
    // (Apollo skip / brief undefined data) — only clear against a real payload.
    if (availabilityLoading || !selectedSlot || slots.length === 0) return;
    if (!isSlotStillAvailable(slots, selectedSlot)) {
      setSelectedSlot(null);
      setSelectedTableId(null);
      setSlotStaleMessage(
        "That time is no longer available — pick another slot.",
      );
    }
  }, [
    availabilityLoading,
    slots,
    selectedSlot,
    setSelectedSlot,
    setSelectedTableId,
    setSlotStaleMessage,
  ]);

  useEffect(() => {
    if (
      selectedPackageId &&
      !packages.some((p) => p.id === selectedPackageId)
    ) {
      setSelectedPackageId(null);
    }
  }, [packages, selectedPackageId, setSelectedPackageId]);

  useEffect(() => {
    if (
      selectedExperienceId &&
      !experiences.some((e) => e.id === selectedExperienceId)
    ) {
      setSelectedExperienceId(null);
    }
  }, [experiences, selectedExperienceId, setSelectedExperienceId]);

  useEffect(() => {
    if (
      selectedPrivateSpaceId &&
      !privateSpaces.some((s) => s.id === selectedPrivateSpaceId)
    ) {
      setSelectedPrivateSpaceId(null);
    }
  }, [privateSpaces, selectedPrivateSpaceId, setSelectedPrivateSpaceId]);

  useEffect(() => {
    if (selectedTableId && !tables.some((t) => t.id === selectedTableId)) {
      setSelectedTableId(null);
    }
  }, [tables, selectedTableId, setSelectedTableId]);
}
