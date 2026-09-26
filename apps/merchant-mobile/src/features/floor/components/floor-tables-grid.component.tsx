import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Empty, Flex, Typography } from "@/components";
import { guestDisplayName } from "@/lib/helpers";

import type { FloorTableState } from "../helpers/floor.types";
import { FloorTableCard } from "./floor-table-card.component";

export type FloorTablesGridProps = {
  tables: FloorTableState[];
  visibleTables: FloorTableState[];
  selectedTableId?: string | null;
  seatingMode: boolean;
  onSelect: (state: FloorTableState) => void;
};

export function FloorTablesGrid({
  tables,
  visibleTables,
  selectedTableId,
  seatingMode,
  onSelect,
}: FloorTablesGridProps) {
  return (
    <Flex gap={1.5}>
      <Typography weight="semibold" size="text-lg">
        Tables
        {visibleTables.length > 0 ? ` · ${visibleTables.length}` : ""}
      </Typography>

      {visibleTables.length === 0 ? (
        <Empty
          title="No tables"
          description={
            tables.length === 0
              ? "Add tables in Partner Hub to run floor ops."
              : "No tables in this area."
          }
        />
      ) : (
        <View style={styles.grid}>
          {visibleTables.map((state) => {
            const isFree = state.status === "free";
            return (
              <FloorTableCard
                key={state.table.id}
                status={state.status}
                table={state.table}
                guestLabel={
                  state.reservation
                    ? guestDisplayName(state.reservation.diner)
                    : null
                }
                turnMinutesRemaining={state.turnMinutesRemaining}
                selected={selectedTableId === state.table.id}
                seatTarget={seatingMode && isFree}
                dimmed={seatingMode && !isFree}
                onPress={() => onSelect(state)}
              />
            );
          })}
        </View>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space(2),
    justifyContent: "space-between",
    paddingVertical: space(0.5),
  },
}));
