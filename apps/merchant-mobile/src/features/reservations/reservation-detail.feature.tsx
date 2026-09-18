import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { ChevronLeftIcon } from "@/assets";
import {
  BottomSheet,
  Button,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { formatSlotDateTime } from "@/lib/helpers/date-time.helpers";

import {
  BOOKABLE_TABLES,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import {
  guestDisplayName,
  nextReservationActions,
  reservationStatusLabel,
  type ReservationAction,
} from "./helpers/reservation-status.helpers";

type ReservationRow = {
  id: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string | null;
  status: string;
  occasion?: string | null;
  guestNotes?: string | null;
  source?: string | null;
  diner?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  tables?: Array<{ id: string; name: string }> | null;
  tableIds?: string[] | null;
};

type ReservationsQuery = {
  restaurantReservations: { items: ReservationRow[] };
};

type BookableTablesQuery = {
  bookableTables: Array<{
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
  }>;
};

export function ReservationDetailFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, activeRestaurant } = useActiveRestaurant();
  const [tableSheetOpen, setTableSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useQuery<ReservationsQuery>(
    RESTAURANT_RESERVATIONS,
    {
      skip: !activeRestaurantId || !id,
      variables: {
        restaurantId: activeRestaurantId,
        limit: 200,
        offset: 0,
      },
      fetchPolicy: "cache-and-network",
    },
  );

  const reservation = useMemo(
    () => data?.restaurantReservations?.items.find((r) => r.id === id) ?? null,
    [data, id],
  );

  const { data: bookableData } = useQuery<BookableTablesQuery>(BOOKABLE_TABLES, {
    skip: !activeRestaurantId || !reservation,
    variables: {
      restaurantId: activeRestaurantId,
      slotStart: reservation?.slotStart,
      partySize: reservation?.partySize ?? 2,
    },
  });

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [updateReservation] = useMutation(UPDATE_RESERVATION);

  const tableOptions = useMemo(() => {
    const bookable = bookableData?.bookableTables ?? [];
    const restaurantTables = (activeRestaurant?.tables ?? []).filter(
      (t) => t.active !== false,
    );
    const byId = new Map<string, { id: string; name: string }>();
    for (const t of restaurantTables) byId.set(t.id, { id: t.id, name: t.name });
    for (const t of bookable) byId.set(t.id, { id: t.id, name: t.name });
    for (const t of reservation?.tables ?? []) byId.set(t.id, t);
    return Array.from(byId.values());
  }, [bookableData, activeRestaurant, reservation]);

  async function handleAction(action: ReservationAction) {
    if (!reservation) return;
    setBusy(true);
    try {
      await updateStatus({
        variables: { id: reservation.id, status: action.status },
      });
      toast.success(`Marked ${action.label.toLowerCase()}`);
      await refetch();
    } catch (err) {
      toast.error("Couldn't update status", {
        description: getGraphQLErrorMessage(err, "Please try again"),
      });
    } finally {
      setBusy(false);
    }
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
        <View style={styles.chromeBtn} />
      </Flex>

      {loading && !reservation ? <Loader fullScreen /> : null}

      {error ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={error.message} />
        </View>
      ) : null}

      {!loading && !reservation ? (
        <View style={styles.pad}>
          <Empty
            title="Reservation not found"
            description="It may have been deleted or belongs to another location."
          />
        </View>
      ) : null}

      {reservation ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.space(3) },
          ]}
        >
          <Typography weight="bold" size="display-xs">
            {guestDisplayName(reservation.diner)}
          </Typography>
          <Typography size="text-md" color="secondary">
            {formatSlotDateTime(reservation.slotStart)} · party of{" "}
            {reservation.partySize}
          </Typography>
          <Typography size="text-md" weight="medium" style={styles.status}>
            {reservationStatusLabel(reservation.status)}
          </Typography>

          {reservation.diner?.phone ? (
            <DetailRow label="Phone" value={reservation.diner.phone} />
          ) : null}
          {reservation.diner?.email ? (
            <DetailRow label="Email" value={reservation.diner.email} />
          ) : null}
          {reservation.source ? (
            <DetailRow label="Source" value={reservation.source} />
          ) : null}
          {reservation.guestNotes ? (
            <DetailRow label="Notes" value={reservation.guestNotes} />
          ) : null}

          <DetailRow
            label="Table"
            value={
              reservation.tables?.map((t) => t.name).join(", ") || "Unassigned"
            }
          />

          <Button
            fullWidth
            size="xl"
            variant="outlined"
            onPress={() => setTableSheetOpen(true)}
            style={styles.assignBtn}
          >
            Assign table
          </Button>

          <Flex gap={1.5} style={styles.actions}>
            {nextReservationActions(reservation.status).map((action) => (
              <Button
                key={action.status}
                fullWidth
                size="xl"
                loading={busy}
                color={
                  action.tone === "error"
                    ? "error"
                    : action.tone === "warning"
                      ? "warning"
                      : "primary"
                }
                variant={
                  action.tone === "error" || action.tone === "warning"
                    ? "outlined"
                    : "filled"
                }
                onPress={() => {
                  void handleAction(action);
                }}
              >
                {action.label}
              </Button>
            ))}
          </Flex>
        </ScrollView>
      ) : null}

      <BottomSheet
        visible={tableSheetOpen}
        onClose={() => setTableSheetOpen(false)}
        title="Assign table"
        showHandle
        headerBorder
        scrollable
      >
        <Flex gap={1}>
          {tableOptions.length === 0 ? (
            <Typography color="secondary">No tables available.</Typography>
          ) : (
            tableOptions.map((table) => (
              <Pressable
                key={table.id}
                onPress={() => {
                  void assignTable(table.id);
                }}
                style={({ pressed }) => [
                  styles.tableOption,
                  pressed && styles.tableOptionPressed,
                ]}
              >
                <Typography weight="semibold" size="text-md">
                  {table.name}
                </Typography>
              </Pressable>
            ))
          )}
        </Flex>
      </BottomSheet>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex gap={0.25} style={styles.detailRow}>
      <Typography size="text-sm" color="muted">
        {label}
      </Typography>
      <Typography size="text-md">{value}</Typography>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
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
  pad: {
    padding: space(2),
  },
  content: {
    padding: space(2),
    gap: space(1),
  },
  status: {
    marginTop: space(0.5),
    marginBottom: space(1),
  },
  detailRow: {
    paddingVertical: space(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  assignBtn: {
    marginTop: space(2),
  },
  actions: {
    marginTop: space(2),
  },
  tableOption: {
    minHeight: space(7),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    justifyContent: "center",
  },
  tableOptionPressed: {
    opacity: 0.85,
  },
}));
