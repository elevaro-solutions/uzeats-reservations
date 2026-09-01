import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { SlidersHorizontalIcon } from "@/assets";
import {
  Button,
  Chip,
  Empty,
  Flex,
  IconButton,
  InlineAlert,
  RestaurantCardSkeleton,
} from "@/components";
import { RestaurantCard, type RestaurantListItem } from "@/features/discovery";
import type { DiscoveryFilters } from "@/store";

import {
  buildActiveFilterChips,
  buildShortcutFilterChips,
} from "../helpers/build-active-filter-chips.helpers";

export type SearchResultsProps = {
  discovery: DiscoveryFilters;
  setDiscovery: (partial: Partial<DiscoveryFilters>) => void;
  onClearQuery: () => void;
  items: RestaurantListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null | undefined;
  onOpenFilters: () => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onClearFilters: () => void;
};

export function SearchResults({
  discovery,
  setDiscovery,
  onClearQuery,
  items,
  loading,
  loadingMore,
  hasMore,
  error,
  onOpenFilters,
  onLoadMore,
  onRefresh,
  onClearFilters,
}: SearchResultsProps) {
  const { theme } = useUnistyles();
  const activeChips = buildActiveFilterChips(discovery, setDiscovery, {
    onClearQuery,
  });
  const shortcutChips = buildShortcutFilterChips(discovery);
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <Flex flex={1}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <IconButton
            icon={<SlidersHorizontalIcon color={theme.colors.primary} />}
            variant="surface"
            accessibilityLabel="Open filters"
            onPress={onOpenFilters}
            style={styles.filtersButton}
          />
          {activeChips.map((chip) => (
            <Chip
              key={chip.key}
              selected
              onDismiss={chip.clear}
              onPress={chip.clear}
            >
              {chip.label}
            </Chip>
          ))}
          {shortcutChips.map((chip) => (
            <Chip key={chip.key} onPress={onOpenFilters}>
              {chip.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.padX}>
          <InlineAlert
            tone="error"
            title="Search failed"
            message={error.message}
          />
          <Button
            variant="outlined"
            color="secondary"
            onPress={onRefresh}
            style={styles.retry}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <Flex gap={2.5} style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </Flex>
      ) : (
        <FlashList
          data={items}
          style={styles.listFlex}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isEmpty ? styles.listEmpty : null,
          ]}
          onEndReached={() => {
            if (hasMore) onLoadMore();
          }}
          onEndReachedThreshold={0.4}
          refreshing={loading && items.length > 0}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            isEmpty ? (
              <Empty
                title="No restaurants found"
                description="Try a different city, cuisine, or clear some filters."
                style={styles.empty}
              >
                <Button
                  variant="outlined"
                  color="secondary"
                  onPress={onClearFilters}
                >
                  Clear filters
                </Button>
              </Empty>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={styles.footerLoader}
              />
            ) : null
          }
          renderItem={({ item }) => <RestaurantCard restaurant={item} />}
        />
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  toolbar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    gap: space(1),
    alignItems: "center",
    paddingHorizontal: space(2),
    paddingVertical: space(0.5),
  },
  filtersButton: {
    borderRadius: radius.full,
  },
  padX: {
    paddingHorizontal: space(2),
  },
  listContent: {
    paddingHorizontal: space(2),
    paddingTop: space(2.5),
    paddingBottom: space(4),
  },
  listFlex: {
    flex: 1,
  },
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: space(4),
  },
  separator: {
    height: space(2.5),
  },
  retry: {
    marginTop: space(1.5),
  },
  footerLoader: {
    marginVertical: space(2),
  },
}));
