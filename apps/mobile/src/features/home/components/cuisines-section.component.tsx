import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, CUISINE_CHIP_WIDTHS, ChipRowSkeleton, Flex } from "@/components";
import type { DiscoveryIndexEntry } from "@/features/discovery";

import { splitCuisineRows } from "../helpers/split-cuisine-rows.helpers";
import { SectionHeader } from "./section-header.component";

export type CuisinesSectionProps = {
  loading: boolean;
  cuisines: DiscoveryIndexEntry[];
  onCuisinePress: (label: string) => void;
};

export function CuisinesSection({
  loading,
  cuisines,
  onCuisinePress,
}: CuisinesSectionProps) {
  const [cuisineRow1, cuisineRow2] = splitCuisineRows(cuisines);

  return (
    <Flex gap={1.5}>
      <SectionHeader title="Cuisines" />
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
              {cuisineRow1.map((c) => (
                <Chip key={c.slug} onPress={() => onCuisinePress(c.label)}>
                  {c.label}
                </Chip>
              ))}
            </Flex>
            {cuisineRow2.length > 0 ? (
              <Flex direction="row" gap={1}>
                {cuisineRow2.map((c) => (
                  <Chip key={c.slug} onPress={() => onCuisinePress(c.label)}>
                    {c.label}
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
