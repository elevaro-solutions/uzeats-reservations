import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { CheckIcon } from "@/assets";
import { BottomSheet, Empty, Flex, Typography } from "@/components";
import { renderIcon } from "@/lib/helpers";

export type AssignTableOption = {
  id: string;
  name: string;
  minCapacity?: number;
  maxCapacity?: number;
};

export type AssignTableSheetProps = {
  visible: boolean;
  title: string;
  tableOptions: AssignTableOption[];
  assignedTableIds: Set<string>;
  busy?: boolean;
  onClose: () => void;
  onAssign: (tableId: string) => void;
};

export function AssignTableSheet({
  visible,
  title,
  tableOptions,
  assignedTableIds,
  busy = false,
  onClose,
  onAssign,
}: AssignTableSheetProps) {
  const { theme } = useUnistyles();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
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
                  onAssign(table.id);
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
                  capacity ? `${table.name}, ${capacity}` : table.name
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
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
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
