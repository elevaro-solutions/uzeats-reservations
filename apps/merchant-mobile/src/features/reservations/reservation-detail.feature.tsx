import { useMutation, useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { toast } from "sonner-native";

import { CheckIcon, ChevronLeftIcon } from "@/assets";
import {
  BottomSheet,
  Button,
  Dialog,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  Loader,
  Typography,
} from "@/components";
import { useActiveRestaurant } from "@/features/restaurants";
import { getGraphQLErrorMessage } from "@/lib/graphql-errors";
import { formatPhoneDisplay, renderIcon } from "@/lib/helpers";

import {
  BOOKABLE_TABLES,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from "./api/reservations.operations";
import { ReservationActionsSheet } from "./components/reservation-actions-sheet.component";
import { ReservationDetailFooter } from "./components/reservation-detail-footer.component";
import { ReservationDetailHero } from "./components/reservation-detail-hero.component";
import {
  ReservationDetailSection,
  type ReservationDetailRow,
} from "./components/reservation-detail-section.component";
import {
  guestDisplayName,
  primaryReservationAction,
  secondaryReservationActions,
  type ReservationAction,
} from "./helpers/reservation-status.helpers";
import {
  reservationOccasionLabel,
} from "./helpers/reservation-occasion.helpers";

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

type BookableTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
};

type BookableTablesQuery = {
  bookableTables: BookableTable[];
};

type TableOption = {
  id: string;
  name: string;
  minCapacity?: number;
  maxCapacity?: number;
};

const ACTIONABLE_STATUSES = new Set(["pending", "confirmed", "seated"]);

function needsConfirmation(action: ReservationAction): boolean {
  return action.status === "cancelled" || action.status === "no_show";
}

export function ReservationDetailFeature() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { activeRestaurantId, activeRestaurant } = useActiveRestaurant();
  const [tableSheetOpen, setTableSheetOpen] = useState(false);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ReservationAction | null>(
    null,
  );
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
    const byId = new Map<string, TableOption>();
    for (const t of restaurantTables) {
      byId.set(t.id, { id: t.id, name: t.name });
    }
    for (const t of bookable) {
      byId.set(t.id, {
        id: t.id,
        name: t.name,
        minCapacity: t.minCapacity,
        maxCapacity: t.maxCapacity,
      });
    }
    for (const t of reservation?.tables ?? []) {
      const existing = byId.get(t.id);
      byId.set(t.id, existing ? { ...existing, name: t.name } : t);
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [bookableData, activeRestaurant, reservation]);

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

  const tableLabel =
    reservation?.tables
      ?.map((t) => t.name)
      .filter(Boolean)
      .join(", ") || null;

  const guestRows = useMemo((): ReservationDetailRow[] => {
    if (!reservation?.diner) return [];
    const rows: ReservationDetailRow[] = [];
    const phone = reservation.diner.phone?.trim();
    const email = reservation.diner.email?.trim();

    if (phone) {
      rows.push({
        key: "phone",
        label: "Phone",
        value: formatPhoneDisplay(phone) || phone,
        onPress: () => {
          void openContactUrl(`tel:${phone}`, "phone");
        },
        accessibilityLabel: `Call ${phone}`,
      });
    }
    if (email) {
      rows.push({
        key: "email",
        label: "Email",
        value: email,
        onPress: () => {
          void openContactUrl(`mailto:${email}`, "email");
        },
        accessibilityLabel: `Email ${email}`,
      });
    }
    return rows;
  }, [reservation]);

  const bookingRows = useMemo((): ReservationDetailRow[] => {
    if (!reservation) return [];
    const rows: ReservationDetailRow[] = [];
    if (reservation.source) {
      rows.push({
        key: "source",
        label: "Source",
        value: reservation.source,
      });
    }
    const occasion = reservationOccasionLabel(reservation.occasion);
    if (occasion) {
      rows.push({
        key: "occasion",
        label: "Occasion",
        value: occasion,
      });
    }
    if (reservation.guestNotes) {
      rows.push({
        key: "notes",
        label: "Notes",
        value: reservation.guestNotes,
      });
    }
    return rows;
  }, [reservation]);

  async function openContactUrl(
    url: string,
    kind: "phone" | "email",
  ): Promise<void> {
    const label = kind === "phone" ? "phone" : "email";
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        toast.error(`Couldn't open ${label}`, {
          description:
            kind === "phone"
              ? "No phone app is available on this device."
              : "No mail app is available on this device.",
        });
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast.error(`Couldn't open ${label}`, {
        description: "Please try again.",
      });
    }
  }

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

  const confirmTitle =
    confirmAction?.status === "no_show"
      ? "Mark as no-show?"
      : "Cancel reservation?";
  const confirmDescription =
    confirmAction?.status === "no_show"
      ? "This guest will be marked as a no-show. You can’t undo this from the app."
      : "This reservation will be cancelled. You can’t undo this from the app.";

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

      {errorMessage && !reservation ? (
        <View style={styles.pad}>
          <InlineAlert tone="error" message={errorMessage} />
          <Button
            fullWidth
            size="lg"
            variant="outlined"
            style={styles.retryBtn}
            onPress={() => {
              void refetch();
            }}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {!loading && !reservation && !error ? (
        <View style={styles.pad}>
          <Empty
            title="Reservation not found"
            description="It may have been deleted or belongs to another location."
          >
            <Button
              size="md"
              variant="outlined"
              onPress={() => router.back()}
            >
              Go back
            </Button>
          </Empty>
        </View>
      ) : null}

      {reservation ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom:
                  primary || secondary.length > 0
                    ? theme.space(3)
                    : insets.bottom + theme.space(3),
              },
            ]}
          >
            <ReservationDetailHero
              diner={reservation.diner}
              status={reservation.status}
              slotStart={reservation.slotStart}
              slotEnd={reservation.slotEnd}
              partySize={reservation.partySize}
              tableLabel={tableLabel}
              occasion={reservation.occasion}
            />

            <ReservationDetailSection title="Guest" rows={guestRows} />

            <ReservationDetailSection title="Booking" rows={bookingRows} />

            <ReservationDetailSection
              title="Table"
              rows={[
                {
                  key: "table",
                  label: "Assigned",
                  value: tableLabel ?? "Unassigned",
                },
              ]}
              footer={
                canAssignTable ? (
                  <Button
                    fullWidth
                    size="lg"
                    variant="outlined"
                    onPress={() => setTableSheetOpen(true)}
                  >
                    {tableLabel ? "Change table" : "Assign table"}
                  </Button>
                ) : undefined
              }
            />
          </ScrollView>

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

      <BottomSheet
        visible={tableSheetOpen}
        onClose={() => setTableSheetOpen(false)}
        title={tableLabel ? "Change table" : "Assign table"}
        showHandle
        headerBorder
        scrollable
        loading={busy}
      >
        {tableOptions.length === 0 ? (
          <Empty
            title="No tables available"
            description="Add active tables for this location, or try a different party size."
          />
        ) : (
          <Flex gap={1}>
            {tableOptions.map((table) => {
              const selected = assignedTableIds.has(table.id);
              const capacity =
                table.minCapacity != null && table.maxCapacity != null
                  ? table.minCapacity === table.maxCapacity
                    ? `${table.maxCapacity} seats`
                    : `${table.minCapacity}–${table.maxCapacity} seats`
                  : null;

              return (
                <Pressable
                  key={table.id}
                  disabled={busy}
                  onPress={() => {
                    void assignTable(table.id);
                  }}
                  style={({ pressed }) => [
                    styles.tableOption,
                    selected && styles.tableOptionSelected,
                    pressed && styles.tableOptionPressed,
                    busy && styles.tableOptionDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    capacity
                      ? `${table.name}, ${capacity}`
                      : table.name
                  }
                >
                  <Flex flex={1} gap={0.25}>
                    <Typography weight="semibold" size="text-md">
                      {table.name}
                    </Typography>
                    {capacity ? (
                      <Typography size="text-sm" color="muted">
                        {capacity}
                      </Typography>
                    ) : null}
                  </Flex>
                  {selected
                    ? renderIcon({
                        icon: <CheckIcon />,
                        color: theme.colors.primary,
                        style: styles.checkIcon,
                      })
                    : null}
                </Pressable>
              );
            })}
          </Flex>
        )}
      </BottomSheet>

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
        title={confirmTitle}
        description={confirmDescription}
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
    gap: space(1.5),
  },
  retryBtn: {
    marginTop: space(1.5),
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: space(2),
    gap: space(2),
  },
  tableOption: {
    minHeight: space(7),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.slate2,
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
  },
  tableOptionSelected: {
    backgroundColor: colors.primary1,
    borderWidth: 1,
    borderColor: colors.primary6,
  },
  tableOptionPressed: {
    opacity: 0.85,
  },
  tableOptionDisabled: {
    opacity: 0.6,
  },
  checkIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
}));
