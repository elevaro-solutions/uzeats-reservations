import type { ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { MapPinIcon, UsersIcon } from "@/assets";
import { Flex, Typography } from "@/components";

import { capacityLabel } from "../helpers/floor-table-sheet.helpers";
import type { FloorTableState } from "../helpers/floor.types";

export type FloorTableSheetFactsProps = {
  table: FloorTableState["table"];
};

function FactRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <Flex
      direction="row"
      alignItems="center"
      gap={1.5}
      style={[styles.factRow, !isLast && styles.factRowBorder]}
    >
      <View style={styles.iconWell}>{icon}</View>
      <Flex flex={1} gap={0.25} style={styles.factCopy}>
        <Typography size="text-xs" color="muted">
          {label}
        </Typography>
        <Typography size="text-md" weight="medium" numberOfLines={2}>
          {value}
        </Typography>
      </Flex>
    </Flex>
  );
}

export function FloorTableSheetFacts({ table }: FloorTableSheetFactsProps) {
  const { theme } = useUnistyles();

  return (
    <Flex gap={1}>
      <Typography
        size="text-xs"
        weight="semibold"
        color="muted"
        style={styles.sectionTitle}
      >
        Table
      </Typography>
      <View style={styles.factsCard}>
        <FactRow
          icon={<UsersIcon size={16} color={theme.colors.textMuted} />}
          label="Capacity"
          value={capacityLabel(table)}
          isLast={!table.floorArea}
        />
        {table.floorArea ? (
          <FactRow
            icon={<MapPinIcon size={16} color={theme.colors.textMuted} />}
            label="Area"
            value={table.floorArea}
            isLast
          />
        ) : null}
      </View>
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space(0.5),
  },
  factsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.secondarySubtle,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  factRow: {
    paddingVertical: space(1.25),
    paddingHorizontal: space(2),
  },
  factRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.secondarySubtle,
  },
  iconWell: {
    width: space(5),
    height: space(5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  factCopy: {
    minWidth: 0,
  },
}));
