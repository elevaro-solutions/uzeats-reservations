import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, RemoteImage, Typography } from "@/components";

import type { BookableTable } from "../types";

export type BookingTablePickerProps = {
  tables: BookableTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string | null) => void;
  loading?: boolean;
};

export function BookingTablePicker({
  tables,
  selectedTableId,
  onSelectTable,
  loading = false,
}: BookingTablePickerProps) {
  const { theme } = useUnistyles();

  if (loading) {
    return (
      <Typography size="text-sm" color="secondary">
        Loading tables…
      </Typography>
    );
  }

  if (tables.length === 0) {
    return (
      <Typography size="text-sm" color="secondary">
        No tables available for this time. A table will be assigned automatically.
      </Typography>
    );
  }

  return (
    <Flex gap={1}>
      <Flex gap={1}>
        {tables.map((table) => {
          const selected = selectedTableId === table.id;
          return (
            <Pressable
              key={table.id}
              onPress={() => onSelectTable(selected ? null : table.id)}
              style={[
                styles.card,
                selected && {
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.primary1,
                },
              ]}
            >
              <Flex direction="row" gap={1.5} alignItems="center">
                {table.photoUrl ? (
                  <RemoteImage
                    uri={table.photoUrl}
                    style={styles.photo}
                    recyclingKey={table.id}
                  />
                ) : (
                  <View style={styles.photoPlaceholder} />
                )}
                <Flex gap={0.25} style={styles.meta}>
                  <Typography weight="semibold">{table.name}</Typography>
                  <Typography size="text-xs" color="secondary">
                    {table.minCapacity}–{table.maxCapacity} guests
                    {table.floorArea ? ` · ${table.floorArea}` : ""}
                  </Typography>
                </Flex>
              </Flex>
            </Pressable>
          );
        })}
      </Flex>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  card: {
    padding: space(1.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.slate3,
  },
  meta: {
    flex: 1,
  },
}));
