import { ScrollView } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components";

import type { ReservationDetailRow } from "./reservation-detail-section.component";
import { ReservationDetailHero } from "./reservation-detail-hero.component";
import { ReservationDetailSection } from "./reservation-detail-section.component";
import type { ReservationRow } from "../helpers/reservation-detail.helpers";
import type { ReservationAction } from "../helpers/reservation-status.helpers";

export type ReservationDetailBodyProps = {
  reservation: ReservationRow;
  guestRows: ReservationDetailRow[];
  bookingRows: ReservationDetailRow[];
  tableLabel: string | null;
  canAssignTable: boolean;
  hasFooterActions: boolean;
  onAssignTable: () => void;
};

export function ReservationDetailBody({
  reservation,
  guestRows,
  bookingRows,
  tableLabel,
  canAssignTable,
  hasFooterActions,
  onAssignTable,
}: ReservationDetailBodyProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: hasFooterActions
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
              color="secondary"
              variant="outlined"
              onPress={onAssignTable}
            >
              {tableLabel ? "Change table" : "Assign table"}
            </Button>
          ) : undefined
        }
      />
    </ScrollView>
  );
}

export type ReservationConfirmDialogCopy = {
  title: string;
  description: string;
};

export function reservationConfirmCopy(
  action: ReservationAction | null,
): ReservationConfirmDialogCopy {
  if (action?.status === "no_show") {
    return {
      title: "Mark as no-show?",
      description:
        "This guest will be marked as a no-show. You can’t undo this from the app.",
    };
  }
  return {
    title: "Cancel reservation?",
    description:
      "This reservation will be cancelled. You can’t undo this from the app.",
  };
}

const styles = StyleSheet.create(({ space }) => ({
  scroll: {
    flex: 1,
  },
  content: {
    padding: space(2),
    gap: space(2),
  },
}));
