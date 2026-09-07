import { useQuery } from "@apollo/client";
import { useMemo } from "react";

import {
  BOOKABLE_TABLES,
  BOOKING_AVAILABILITY,
  BOOKING_RESTAURANT,
  EXPERIENCES,
  MY_RESTAURANT_LOYALTY_BALANCE,
  MY_WAITLIST,
  PRIVATE_DINING_SPACES,
  RESTAURANT_PACKAGES,
} from "../api/booking.operations";
import {
  filterExperiencesForDate,
  filterPackagesForParty,
  filterPrivateSpacesForParty,
} from "../helpers/booking-validation.helpers";
import {
  getMaxBookablePartySize,
  isPartyTooLarge,
} from "../helpers/max-bookable-party-size.helpers";
import { filterFutureSlots } from "../helpers/time-slots.helpers";
import type {
  AvailabilitySlot,
  BookableExperience,
  BookablePackage,
  BookableTable,
  BookingStep,
  PrivateDiningSpace,
  RestaurantBookingInfo,
} from "../types";

type MyWaitlistEntry = {
  id: string;
  restaurantId: string;
  preferredDate: string;
  status: string;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
};

const ACTIVE_WAITLIST_STATUSES = new Set(["waiting", "notified"]);

export type UseBookingDataParams = {
  restaurantId: string | undefined;
  date: string;
  partySize: number;
  selectedSlot: string | null;
  step: BookingStep;
  userId: string | undefined;
};

export function useBookingData({
  restaurantId,
  date,
  partySize,
  selectedSlot,
  step,
  userId,
}: UseBookingDataParams) {
  const {
    data: restaurantData,
    loading: restaurantLoading,
    error: restaurantError,
  } = useQuery<{ restaurant: RestaurantBookingInfo | null }>(
    BOOKING_RESTAURANT,
    {
      variables: { id: restaurantId },
      skip: !restaurantId,
    },
  );

  const restaurant = restaurantData?.restaurant;

  const {
    data: availabilityData,
    loading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery<{ availability: AvailabilitySlot[] }>(BOOKING_AVAILABILITY, {
    variables: { restaurantId, date, partySize },
    skip: !restaurantId || !restaurant?.reservationsVisible,
    fetchPolicy: "network-only",
  });

  const slots = useMemo(
    () => filterFutureSlots(availabilityData?.availability ?? []),
    [availabilityData],
  );
  const availableCount = slots.filter((s) => s.available).length;

  const { data: tablesData, loading: tablesLoading } = useQuery<{
    bookableTables: BookableTable[];
  }>(BOOKABLE_TABLES, {
    variables: {
      restaurantId,
      slotStart: selectedSlot,
      partySize,
    },
    skip:
      !restaurantId ||
      !selectedSlot ||
      !restaurant?.allowGuestTableSelection ||
      step !== "details",
    fetchPolicy: "network-only",
  });

  const { data: packagesData } = useQuery<{
    restaurantPackages: BookablePackage[];
  }>(RESTAURANT_PACKAGES, {
    variables: { restaurantId, activeOnly: true },
    skip: !restaurantId || step !== "details",
  });

  const { data: experiencesData } = useQuery<{
    experiences: { items: BookableExperience[] };
  }>(EXPERIENCES, {
    variables: { restaurantId, upcoming: true, limit: 20 },
    skip: !restaurantId || step !== "details",
  });

  const { data: privateSpacesData } = useQuery<{
    privateDiningSpaces: PrivateDiningSpace[];
  }>(PRIVATE_DINING_SPACES, {
    variables: { restaurantId },
    skip: !restaurantId || step !== "details",
  });

  const { data: restaurantLoyaltyData } = useQuery<{
    myRestaurantLoyaltyBalance: number;
  }>(MY_RESTAURANT_LOYALTY_BALANCE, {
    variables: { restaurantId },
    skip: !restaurantId || !userId || step !== "details",
  });

  const { data: myWaitlistData, refetch: refetchMyWaitlist } = useQuery<{
    myWaitlist: MyWaitlistEntry[];
  }>(MY_WAITLIST, {
    skip: !userId || !restaurantId,
    fetchPolicy: "cache-and-network",
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

  const tables = tablesData?.bookableTables ?? [];
  const restaurantLoyaltyBalance =
    restaurantLoyaltyData?.myRestaurantLoyaltyBalance ?? 0;

  const maxBookablePartySize = useMemo(
    () => getMaxBookablePartySize(restaurant?.tables),
    [restaurant?.tables],
  );
  const partyTooLarge = isPartyTooLarge(partySize, maxBookablePartySize);

  const isOnWaitlist = useMemo(() => {
    if (!restaurantId) return false;
    return (myWaitlistData?.myWaitlist ?? []).some(
      (entry) =>
        entry.restaurantId === restaurantId &&
        entry.preferredDate === date &&
        ACTIVE_WAITLIST_STATUSES.has(entry.status),
    );
  }, [myWaitlistData?.myWaitlist, restaurantId, date]);

  return {
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
  };
}
