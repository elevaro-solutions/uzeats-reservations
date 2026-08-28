import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  Chip,
  CUISINE_CHIP_WIDTHS,
  ChipRowSkeleton,
  Flex,
} from "@/components";
import { SectionHeader } from "@/features/home/components/section-header.component";
import { splitCuisineRows } from "@/features/home/helpers/split-cuisine-rows.helpers";

import type { DiscoveryIndexEntry } from "../types";

export type DiscoveryCuisineSectionProps = {
  loading: boolean;
  cuisines: DiscoveryIndexEntry[];
  onPress: (label: string) => void;
};

export function DiscoveryCuisineSection({
  loading,
  cuisines,
  onPress,
}: DiscoveryCuisineSectionProps) {
  const [row1, row2] = splitCuisineRows(cuisines);

  if (!loading && cuisines.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <SectionHeader title="Search by cuisine" />
      {loading && cuisines.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <ChipRowSkeleton widths={CUISINE_CHIP_WIDTHS} rows={2} />
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Flex gap={1}>
            <Flex direction="row" gap={1}>
              {row1.map((cuisine) => (
                <Chip
                  key={cuisine.slug}
                  onPress={() => onPress(cuisine.label)}
                >
                  {cuisine.label}
                </Chip>
              ))}
            </Flex>
            {row2.length > 0 ? (
              <Flex direction="row" gap={1}>
                {row2.map((cuisine) => (
                  <Chip
                    key={cuisine.slug}
                    onPress={() => onPress(cuisine.label)}
                  >
                    {cuisine.label}
                  </Chip>
                ))}
              </Flex>
            ) : null}
          </Flex>
        </ScrollView>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  chipScroll: {
    paddingHorizontal: space(2),
  },
}));
