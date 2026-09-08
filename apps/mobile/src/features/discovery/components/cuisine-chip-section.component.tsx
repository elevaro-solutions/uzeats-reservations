import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, Flex } from "@/components";
import {
  ChipRowSkeleton,
  CUISINE_CHIP_WIDTHS,
} from "@/components/skeleton";

import { splitCuisineRows } from "../helpers/split-cuisine-rows.helpers";
import type { DiscoveryIndexEntry } from "../types";
import { SectionHeader } from "./section-header.component";

export type CuisineChipSectionProps = {
  title: string;
  loading: boolean;
  cuisines: DiscoveryIndexEntry[];
  hideWhenEmpty?: boolean;
  onPress: (label: string) => void;
};

export function CuisineChipSection({
  title,
  loading,
  cuisines,
  hideWhenEmpty = false,
  onPress,
}: CuisineChipSectionProps) {
  const [row1, row2] = splitCuisineRows(cuisines);

  if (hideWhenEmpty && !loading && cuisines.length === 0) return null;

  return (
    <Flex gap={1.5}>
      <SectionHeader title={title} />
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
