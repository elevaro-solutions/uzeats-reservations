import { useMutation } from "@apollo/client";
import { preferredWindowFromSlot } from "@reservations/shared";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { JOIN_WAITLIST } from "../api/booking.operations";

type JoinWaitlistPayload = {
  joinWaitlist: {
    id: string;
    status: string;
    preferredDate?: string | null;
    position?: number | null;
    estimatedWaitMinutes?: number | null;
  };
};

export type WaitlistSuccessState = {
  position?: number | null;
  estimatedWaitMinutes?: number | null;
};

export type UseBookingWaitlistParams = {
  restaurantId: string | undefined;
  user: { id: string } | null | undefined;
  partySize: number;
  date: string;
  selectedSlot?: string | null;
  timeZone?: string | null;
  persistDraft: () => void;
  refetchMyWaitlist: () => Promise<unknown>;
};

export type UseBookingWaitlistResult = {
  waitlistLoading: boolean;
  waitlistSuccess: WaitlistSuccessState | null;
  dismissWaitlistSuccess: () => void;
  onJoinWaitlist: () => Promise<void>;
};

export function useBookingWaitlist({
  restaurantId,
  user,
  partySize,
  date,
  selectedSlot,
  timeZone,
  persistDraft,
  refetchMyWaitlist,
}: UseBookingWaitlistParams): UseBookingWaitlistResult {
  const router = useRouter();
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] =
    useState<WaitlistSuccessState | null>(null);

  const [joinWaitlist] = useMutation<JoinWaitlistPayload>(JOIN_WAITLIST);

  const onJoinWaitlist = useCallback(async () => {
    if (!user) {
      persistDraft();
      router.push({
        pathname: "/sign-in",
        params: { next: `/restaurant/${restaurantId}/book?resume=1` },
      });
      return;
    }
    if (!restaurantId) return;

    setWaitlistLoading(true);
    try {
      const preferredWindow =
        selectedSlot && timeZone
          ? preferredWindowFromSlot(selectedSlot, timeZone)
          : selectedSlot
            ? preferredWindowFromSlot(selectedSlot, "UTC")
            : null;
      const { data } = await joinWaitlist({
        variables: {
          input: {
            restaurantId,
            partySize,
            preferredDate: date,
            ...(preferredWindow ?? {}),
          },
        },
      });
      const entry = data?.joinWaitlist;
      setWaitlistSuccess({
        position: entry?.position,
        estimatedWaitMinutes: entry?.estimatedWaitMinutes,
      });
      await refetchMyWaitlist();
    } catch (err) {
      const message = getGraphQLErrorMessage(err, "Could not join waitlist");
      const alreadyJoined = /already on the waitlist/i.test(message);
      if (alreadyJoined) {
        setWaitlistSuccess({});
        await refetchMyWaitlist();
      } else {
        Alert.alert("Waitlist", message);
      }
    } finally {
      setWaitlistLoading(false);
    }
  }, [
    user,
    persistDraft,
    router,
    restaurantId,
    partySize,
    date,
    selectedSlot,
    timeZone,
    joinWaitlist,
    refetchMyWaitlist,
  ]);

  const dismissWaitlistSuccess = useCallback(() => {
    setWaitlistSuccess(null);
  }, []);

  return {
    waitlistLoading,
    waitlistSuccess,
    dismissWaitlistSuccess,
    onJoinWaitlist,
  };
}
