import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ClockIcon, TrendingUpIcon } from "@/assets";
import { DiningStylesGridSkeleton, Flex } from "@/components";
import { DiningStylesGrid } from "@/features/home/components/dining-styles-grid.component";
import { SectionHeader } from "@/features/home/components/section-header.component";
import type { DiningStyleTile } from "@/features/home/data/dining-styles";

import type {
  RecentSearchEntry,
  ScopedDiscoveryIndexData,
  TrendingSearchTerm,
} from "../types";
import { DiscoveryChipSection } from "./discovery-chip-section.component";
import { DiscoveryCuisineSection } from "./discovery-cuisine-section.component";
import { DiscoveryMealsSection } from "./discovery-meals-section.component";

export type SearchDiscoveryProps = {
  loading: boolean;
  recent: RecentSearchEntry[];
  trending: TrendingSearchTerm[];
  browse: ScopedDiscoveryIndexData | null;
  onRecentPress: (entry: RecentSearchEntry) => void;
  onTrendingPress: (term: TrendingSearchTerm) => void;
  onBrowsePress: (
    kind: "cuisine" | "occasion" | "meal" | "diningStyle" | "dietary" | "amenity",
    label: string,
  ) => void;
  onDiningStyleSelect: (tile: DiningStyleTile) => void;
};

export function SearchDiscovery({
  loading,
  recent,
  trending,
  browse,
  onRecentPress,
  onTrendingPress,
  onBrowsePress,
  onDiningStyleSelect,
}: SearchDiscoveryProps) {
  const cuisines = browse?.cuisines ?? [];
  const meals = browse?.meals ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Flex gap={2.5}>
        {recent.length > 0 ? (
          <DiscoveryChipSection
            title="Recent searches"
            loading={false}
            icon={<ClockIcon size={16} />}
            items={recent.map((entry) => ({
              key: entry.id,
              label: entry.label,
            }))}
            onPress={(item) => {
              const entry = recent.find((recentItem) => recentItem.id === item.key);
              if (entry) onRecentPress(entry);
            }}
          />
        ) : null}

        <DiscoveryChipSection
          title="Trending searches"
          loading={loading}
          icon={<TrendingUpIcon size={16} />}
          items={trending.map((term) => ({
            key: `${term.kind}-${term.term}`,
            label: term.term,
          }))}
          onPress={(item) => {
            const term = trending.find(
              (trendingItem) =>
                `${trendingItem.kind}-${trendingItem.term}` === item.key,
            );
            if (term) onTrendingPress(term);
          }}
        />

        <DiscoveryCuisineSection
          loading={loading}
          cuisines={cuisines}
          onPress={(label) => onBrowsePress("cuisine", label)}
        />

        <DiscoveryMealsSection
          loading={loading}
          meals={meals}
          onPress={(label) => onBrowsePress("meal", label)}
        />

        <Flex gap={1.5}>
          <SectionHeader title="Dining styles" />
          {loading && !browse ? (
            <DiningStylesGridSkeleton />
          ) : (
            <DiningStylesGrid onSelect={onDiningStyleSelect} />
          )}
        </Flex>
      </Flex>
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  content: {
    paddingTop: space(0.5),
    paddingBottom: space(4),
  },
}));
