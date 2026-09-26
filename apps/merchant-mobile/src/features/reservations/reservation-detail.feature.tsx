import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { toast } from "sonner-native";

import { Button, Dialog, Flex } from "@/components";
import { useActiveRestaurant, syncActiveRestaurantId } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { guestDisplayName } from "@/lib/helpers";
import { PLATFORM_TIMEZONE } from "@reservations/shared";

import {
  BOOKABLE_TABLES,
  PARTNER_RESERVATION,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import {
  AssignTableSheet,
  type AssignTableOption,
} from "./components/assign-table-sheet.component";
import { ReservationActionsSheet } from "./components/reservation-actions-sheet.component";
import {
  ReservationDetailBody,
  reservationConfirmCopy,
} from "./components/reservation-detail-body.component";
import { ReservationDetailFooter } from "./components/reservation-detail-footer.component";
import { ReservationDetailSkeleton } from "./components/reservation-detail-skeleton.component";
import {
  ReservationDetailChrome,
  ReservationDetailErrorState,
  ReservationDetailNotFound,
} from "./components/reservation-detail-states.component";
import {
  ACTIONABLE_STATUSES,
  buildAssignTableOptions,
  buildBookingRows,
  buildGuestRows,
  needsConfirmation,
  openContactUrl,
  reservationTableLabel,
  type ReservationRow,
} from "./helpers/reservation-detail.helpers";
import {
  primaryReservationAction,
  secondaryReservationActions,
  type ReservationAction,
} from "./helpers/reservation-status.helpers";

type PartnerReservationQuery = {
  partnerReservation: ReservationRow | null;
};

type BookableTablesQuery = {
  bookableTables: AssignTableOption[];
};

export function ReservationDetailFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurants, activeRestaurant } = useActiveRestaurant();
  const [tableSheetOpen, setTableSheetOpen] = useState(false);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ReservationAction | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useQuery<PartnerReservationQuery>(
    PARTNER_RESERVATION,
    {
      skip: !id,
      variables: { id },
      fetchPolicy: "cache-and-network",
    },
  );

  const reservation = data?.partnerReservation ?? null;
  const venueRestaurantId = reservation?.restaurantId ?? null;
  const venueRestaurant =
    restaurants.find((r) => r.id === venueRestaurantId) ??
    (activeRestaurant?.id === venueRestaurantId ? activeRestaurant : null);
  const timeZone =
    venueRestaurant?.timezone ??
    activeRestaurant?.timezone ??
    PLATFORM_TIMEZONE;

  useEffect(() => {
    syncActiveRestaurantId(venueRestaurantId, { restaurants });
  }, [venueRestaurantId, restaurants]);

  const { data: bookableData } = useQuery<BookableTablesQuery>(BOOKABLE_TABLES, {
    skip: !venueRestaurantId || !reservation,
    variables: {
      restaurantId: venueRestaurantId,
      slotStart: reservation?.slotStart,
      partySize: reservation?.partySize ?? 2,
    },
  });

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [updateReservation] = useMutation(UPDATE_RESERVATION);

  const tableOptions = useMemo(
    () =>
      buildAssignTableOptions({
        restaurantTables: venueRestaurant?.tables ?? [],
        bookableTables: bookableData?.bookableTables ?? [],
        assignedTables: reservation?.tables,
      }),
    [bookableData, venueRestaurant, reservation],
  );

  const assignedTableIds = useMemo(
    () => new Set((reservation?.tables ?? []).map((t) => t.id)),
    [reservation],
  );

  const canAssignTable = reservation
    ? ACTIONABLE_STATUSES.has(reservation.status)
    : false;
  const primary = reservation
    ? primaryReservationAction(reservation.status)
    : null;
  const secondary = reservation
    ? secondaryReservationActions(reservation.status)
    : [];
  const tableLabel = reservationTableLabel(reservation?.tables);

  const guestRows = useMemo(
    () =>
      reservation
        ? buildGuestRows(reservation, {
            onPhonePress: (phone) => {
              void openContactUrl(`tel:${phone}`, "phone");
            },
            onEmailPress: (email) => {
              void openContactUrl(`mailto:${email}`, "email");
            },
          })
        : [],
    [reservation],
  );
  const bookingRows = useMemo(
    () => (reservation ? buildBookingRows(reservation) : []),
    [reservation],
  );

  async function runStatusUpdate(action: ReservationAction) {
    if (!reservation) return;
    setBusy(true);
    try {
      await updateStatus({
        variables: { id: reservation.id, status: action.status },
      });
      toast.success(`Marked ${action.label.toLowerCase()}`);
      setConfirmAction(null);
      setActionsSheetOpen(false);
      await refetch();
    } catch (err) {
      toast.error("Couldn't update status", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
  }

  function handleAction(action: ReservationAction) {
    if (needsConfirmation(action)) {
      setActionsSheetOpen(false);
      setConfirmAction(action);
      return;
    }
    void runStatusUpdate(action);
  }

  async function assignTable(tableId: string) {
    if (!reservation) return;
    setBusy(true);
    try {
      await updateReservation({
        variables: { id: reservation.id, input: { tableId } },
      });
      toast.success("Table assigned");
      setTableSheetOpen(false);
      await refetch();
    } catch (err) {
      toast.error("Couldn't assign table", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
  }

  const errorMessage = error
    ? getGraphQLErrorMessage(error, "Couldn't load this reservation.")
    : null;
  const confirmCopy = reservationConfirmCopy(confirmAction);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ReservationDetailChrome onBack={() => router.back()} />

      {loading && !reservation ? <ReservationDetailSkeleton /> : null}
      {errorMessage && !reservation ? (
        <ReservationDetailErrorState
          message={errorMessage}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {!loading && !reservation && !error ? (
        <ReservationDetailNotFound onBack={() => router.back()} />
      ) : null}

      {reservation ? (
        <>
          <ReservationDetailBody
            reservation={reservation}
            guestRows={guestRows}
            bookingRows={bookingRows}
            tableLabel={tableLabel}
            canAssignTable={canAssignTable}
            hasFooterActions={Boolean(primary || secondary.length > 0)}
            timeZone={timeZone}
            onAssignTable={() => setTableSheetOpen(true)}
          />
          <ReservationDetailFooter
            primary={primary}
            hasSecondary={secondary.length > 0}
            loading={busy}
            onPrimary={() => {
              if (primary) handleAction(primary);
            }}
            onMore={() => setActionsSheetOpen(true)}
          />
        </>
      ) : null}

      <AssignTableSheet
        visible={tableSheetOpen}
        onClose={() => setTableSheetOpen(false)}
        title={tableLabel ? "Change table" : "Assign table"}
        tableOptions={tableOptions}
        assignedTableIds={assignedTableIds}
        busy={busy}
        onAssign={(tableId) => {
          void assignTable(tableId);
        }}
      />

      <ReservationActionsSheet
        visible={actionsSheetOpen}
        guestName={guestDisplayName(reservation?.diner)}
        actions={secondary}
        loading={busy}
        onClose={() => setActionsSheetOpen(false)}
        onAction={handleAction}
      />

      <Dialog
        visible={Boolean(confirmAction)}
        onClose={() => {
          if (!busy) setConfirmAction(null);
        }}
        loading={busy}
        title={confirmCopy.title}
        description={confirmCopy.description}
        actions={
          <Flex gap={1}>
            <Button
              fullWidth
              size="lg"
              color={confirmAction?.tone === "error" ? "error" : "primary"}
              loading={busy}
              onPress={() => {
                if (confirmAction) void runStatusUpdate(confirmAction);
              }}
            >
              {confirmAction?.label ?? "Confirm"}
            </Button>
            <Button
              fullWidth
              size="md"
              variant="text"
              color="secondary"
              disabled={busy}
              onPress={() => setConfirmAction(null)}
            >
              Keep reservation
            </Button>
          </Flex>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create(({ colors }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
