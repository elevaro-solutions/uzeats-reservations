import { router } from "expo-router";
import { toast } from "sonner-native";

import { apolloClient, MESSAGES } from "@/graphql";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

import { REPORT_RUNNING_LATE } from "../api/notifications.operations";

const inFlight = new Set<string>();
const reported = new Set<string>();

export function hasReportedRunningLate(reservationId: string): boolean {
  return reported.has(reservationId);
}

export type ReportRunningLateOptions = {
  /** Default true — open the reservation message thread after a successful report. */
  navigate?: boolean;
};

/**
 * Tells the restaurant the guest is running late, then (by default) opens the
 * reservation thread. In-flight and session guards prevent double posts.
 */
export async function reportRunningLateAndOpenThread(
  reservationId: string,
  options?: ReportRunningLateOptions,
): Promise<boolean> {
  const navigate = options?.navigate !== false;

  if (reported.has(reservationId)) {
    if (navigate) {
      router.push(`/reservations/${reservationId}/messages` as never);
    }
    return true;
  }

  if (inFlight.has(reservationId)) return false;
  inFlight.add(reservationId);

  try {
    await apolloClient.mutate({
      mutation: REPORT_RUNNING_LATE,
      variables: { reservationId },
      refetchQueries: [{ query: MESSAGES, variables: { reservationId } }],
    });
    reported.add(reservationId);
    toast.success("Restaurant notified that you're running late");
    if (navigate) {
      router.push(`/reservations/${reservationId}/messages` as never);
    }
    return true;
  } catch (err) {
    toast.error("Could not notify the restaurant", {
      description: getGraphQLErrorMessage(
        err,
        "Could not notify the restaurant",
      ),
    });
    return false;
  } finally {
    inFlight.delete(reservationId);
  }
}
