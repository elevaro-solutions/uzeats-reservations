import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, ChipRowSkeleton, Flex, TRENDING_CHIP_WIDTHS } from "@/components";
import type { DiscoveryIndexEntry } from "@/features/discovery";

import { FilterSectionHeader } from "../filter-section-header.component";

export type FiltersCuisineSectionProps = {
  loading: boolean;
  cuisines: DiscoveryIndexEntry[];
  selected?: string;
  onSelect: (label: string | undefined) => void;
};

export function FiltersCuisineSection({
  loading,
  cuisines,
  selected,
  onSelect,
}: FiltersCuisineSectionProps) {
  if (!loading && cuisines.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <FilterSectionHeader title="Cuisine" selectedCount={selected ? 1 : 0} />
      {loading && cuisines.length === 0 ? (
        <ChipRowSkeleton widths={TRENDING_CHIP_WIDTHS} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip selected={!selected} onPress={() => onSelect(undefined)}>
            Any
          </Chip>
          {cuisines.map((cuisine) => (
            <Chip
              key={cuisine.slug}
              selected={selected === cuisine.label}
              onPress={() => onSelect(cuisine.label)}
            >
              {cuisine.label}
            </Chip>
          ))}
        </ScrollView>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  chipRow: {
    gap: space(1),
    alignItems: "center",
  },
}));
