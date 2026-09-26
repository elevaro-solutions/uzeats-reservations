import { Flex, Typography } from "@/components";

import type { UnassignedReservation } from "../helpers/floor.types";
import { FloorArrivingCard } from "./floor-arriving-card.component";

export type FloorArrivingSectionProps = {
  unassigned: UnassignedReservation[];
  selectedUnassignedId: string | null;
  onSelect: (id: string | null) => void;
};

export function FloorArrivingSection({
  unassigned,
  selectedUnassignedId,
  onSelect,
}: FloorArrivingSectionProps) {
  if (unassigned.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <Flex gap={0.5}>
        <Typography weight="semibold" size="text-lg">
          Arriving · {unassigned.length}
        </Typography>
        <Typography size="text-sm" color="secondary">
          Select a guest, then tap a free table to seat them.
        </Typography>
      </Flex>
      <Flex gap={1}>
        {unassigned.map((item) => {
          const selectedRow = item.id === selectedUnassignedId;
          return (
            <FloorArrivingCard
              key={item.id}
              item={item}
              selected={selectedRow}
              onPress={() => onSelect(selectedRow ? null : item.id)}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}
