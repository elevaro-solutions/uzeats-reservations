import { useQuery } from "@apollo/client";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { SlidersHorizontalIcon, XIcon } from "@/assets";
import {
  Button,
  Chip,
  Empty,
  Flex,
  InlineAlert,
  Input,
  Skeleton,
  Typography,
} from "@/components";
import {
  RestaurantCard,
  buildSearchInput,
  useInfiniteRestaurantSearch,
  type DiscoveryIndexData,
} from "@/features/discovery";
import { DISCOVERY_INDEX } from "@/graphql";
import { useAppStore } from "@/store";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function SearchFeature() {
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ cuisine?: string; q?: string }>();
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const resetDiscovery = useAppStore((s) => s.resetDiscovery);

  const [queryDraft, setQueryDraft] = useState(discovery.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(queryDraft, 350);

  useEffect(() => {
    if (typeof params.cuisine === "string" && params.cuisine) {
      setDiscovery({ cuisine: params.cuisine });
    }
    if (typeof params.q === "string") {
      setQueryDraft(params.q);
      setDiscovery({ query: params.q });
    }
  }, [params.cuisine, params.q, setDiscovery]);

  useEffect(() => {
    if (debouncedQuery !== discovery.query) {
      setDiscovery({ query: debouncedQuery });
    }
  }, [debouncedQuery, discovery.query, setDiscovery]);

  const searchInput = useMemo(
    () => buildSearchInput(discovery),
    [discovery],
  );

  const {
    items,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useInfiniteRestaurantSearch(searchInput);

  const { data: indexData } = useQuery<{ discoveryIndex: DiscoveryIndexData }>(
    DISCOVERY_INDEX,
    { fetchPolicy: "cache-first" },
  );

  const cuisines = indexData?.discoveryIndex.cuisines ?? [];

  const activeChips: Array<{ key: string; label: string; clear: () => void }> =
    [];

  activeChips.push({
    key: "date",
    label: formatDateLabel(discovery.date),
    clear: () => {
      /* date is required for availability; keep but allow opening filters */
    },
  });
  activeChips.push({
    key: "party",
    label: `${discovery.partySize} guests`,
    clear: () => setDiscovery({ partySize: 2 }),
  });
  if (discovery.cuisine) {
    activeChips.push({
      key: "cuisine",
      label: discovery.cuisine,
      clear: () => setDiscovery({ cuisine: undefined }),
    });
  }
  if (discovery.nearMe) {
    activeChips.push({
      key: "near",
      label: "Near me",
      clear: () =>
        setDiscovery({
          nearMe: false,
          lat: undefined,
          lng: undefined,
          locationLabel: undefined,
        }),
    });
  }
  if (discovery.priceRange) {
    activeChips.push({
      key: "price",
      label: "$".repeat(discovery.priceRange),
      clear: () => setDiscovery({ priceRange: undefined }),
    });
  }
  if (discovery.minRating) {
    activeChips.push({
      key: "rating",
      label: `${discovery.minRating}+ ★`,
      clear: () => setDiscovery({ minRating: undefined }),
    });
  }
  for (const style of discovery.diningStyles ?? []) {
    activeChips.push({
      key: `style-${style}`,
      label: style,
      clear: () => {
        const next = (discovery.diningStyles ?? []).filter((s) => s !== style);
        setDiscovery({ diningStyles: next.length ? next : undefined });
      },
    });
  }
  for (const occasion of discovery.occasions ?? []) {
    activeChips.push({
      key: `occasion-${occasion}`,
      label: occasion,
      clear: () => {
        const next = (discovery.occasions ?? []).filter((o) => o !== occasion);
        setDiscovery({ occasions: next.length ? next : undefined });
      },
    });
  }
  for (const meal of discovery.meals ?? []) {
    activeChips.push({
      key: `meal-${meal}`,
      label: meal,
      clear: () => {
        const next = (discovery.meals ?? []).filter((m) => m !== meal);
        setDiscovery({ meals: next.length ? next : undefined });
      },
    });
  }
  for (const amenity of discovery.amenities ?? []) {
    activeChips.push({
      key: `amenity-${amenity}`,
      label: amenity,
      clear: () => {
        const next = (discovery.amenities ?? []).filter((a) => a !== amenity);
        setDiscovery({ amenities: next.length ? next : undefined });
      },
    });
  }

  return (
    <Flex flex={1} style={styles.screen}>
      <Flex gap={1.5} style={styles.header}>
        <Flex direction="row" gap={1} alignItems="center">
          <Flex flex={1}>
            <Input
              value={queryDraft}
              onChangeText={setQueryDraft}
              placeholder="Search restaurants…"
              returnKeyType="search"
              autoCorrect={false}
            />
          </Flex>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={styles.filterBtn}
            accessibilityLabel="Open filters"
          >
            <SlidersHorizontalIcon size={20} color={theme.colors.primary} />
          </Pressable>
        </Flex>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {activeChips.map((chip) => (
            <Chip
              key={chip.key}
              selected
              onPress={() => {
                if (chip.key === "date" || chip.key === "party") {
                  setFiltersOpen(true);
                  return;
                }
                chip.clear();
              }}
            >
              {chip.label}
            </Chip>
          ))}
          <Chip onPress={() => setFiltersOpen(true)}>More filters</Chip>
        </ScrollView>

        {!loading && !error ? (
          <Typography size="text-sm" color="secondary">
            {total} restaurant{total === 1 ? "" : "s"}
          </Typography>
        ) : null}
      </Flex>

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
            onPress={() => refresh()}
            style={styles.retry}
          >
            Try again
          </Button>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <Flex gap={1.5} style={styles.padX}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={220} radius="lg" />
          ))}
        </Flex>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          onEndReachedThreshold={0.4}
          refreshing={loading && items.length > 0}
          onRefresh={() => refresh()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            !loading && !error ? (
              <Empty
                title="No restaurants found"
                description="Try a different city, cuisine, or clear some filters."
              >
                <Button
                  variant="outlined"
                  color="secondary"
                  onPress={() => {
                    resetDiscovery();
                    setQueryDraft("");
                  }}
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

      <FiltersSheet
        visible={filtersOpen}
        cuisines={cuisines.map((c) => c.label)}
        onClose={() => setFiltersOpen(false)}
      />
    </Flex>
  );
}

type FiltersSheetProps = {
  visible: boolean;
  cuisines: string[];
  onClose: () => void;
};

function FiltersSheet({ visible, cuisines, onClose }: FiltersSheetProps) {
  const discovery = useAppStore((s) => s.discovery);
  const setDiscovery = useAppStore((s) => s.setDiscovery);
  const { theme } = useUnistyles();

  const [date, setDate] = useState(discovery.date);
  const [time, setTime] = useState(discovery.time ?? "");
  const [partySize, setPartySize] = useState(String(discovery.partySize));
  const [cuisine, setCuisine] = useState(discovery.cuisine ?? "");
  const [priceRange, setPriceRange] = useState<number | undefined>(
    discovery.priceRange,
  );
  const [minRating, setMinRating] = useState<number | undefined>(
    discovery.minRating,
  );
  const [radiusKm, setRadiusKm] = useState(String(discovery.radiusKm));
  const [accessible, setAccessible] = useState(
    Boolean(discovery.wheelchairAccessible),
  );

  useEffect(() => {
    if (!visible) return;
    setDate(discovery.date);
    setTime(discovery.time ?? "");
    setPartySize(String(discovery.partySize));
    setCuisine(discovery.cuisine ?? "");
    setPriceRange(discovery.priceRange);
    setMinRating(discovery.minRating);
    setRadiusKm(String(discovery.radiusKm));
    setAccessible(Boolean(discovery.wheelchairAccessible));
  }, [visible, discovery]);

  function apply() {
    const party = Math.min(50, Math.max(1, Number(partySize) || 2));
    const radius = Math.min(100, Math.max(0.5, Number(radiusKm) || 25));
    setDiscovery({
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : discovery.date,
      time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
      partySize: party,
      cuisine: cuisine.trim() || undefined,
      priceRange,
      minRating,
      radiusKm: radius,
      wheelchairAccessible: accessible || undefined,
    });
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Flex flex={1} style={styles.sheet}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          style={styles.sheetHeader}
        >
          <Typography size="text-xl" weight="bold">
            Filters
          </Typography>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <XIcon size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </Flex>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Input
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            helperText="Format: YYYY-MM-DD"
          />
          <Input
            label="Time (optional)"
            value={time}
            onChangeText={setTime}
            placeholder="19:00"
            autoCapitalize="none"
            helperText="Format: HH:MM (24h)"
          />
          <Input
            label="Party size"
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
          />

          <Typography weight="medium" size="text-sm">
            Cuisine
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              selected={!cuisine}
              onPress={() => setCuisine("")}
            >
              Any
            </Chip>
            {cuisines.slice(0, 20).map((c) => (
              <Chip
                key={c}
                selected={cuisine === c}
                onPress={() => setCuisine(c)}
              >
                {c}
              </Chip>
            ))}
          </ScrollView>

          <Typography weight="medium" size="text-sm">
            Price
          </Typography>
          <Flex direction="row" gap={1} flexWrap="wrap">
            {[undefined, 1, 2, 3, 4].map((p) => (
              <Chip
                key={String(p)}
                selected={priceRange === p}
                onPress={() => setPriceRange(p)}
              >
                {p == null ? "Any" : "$".repeat(p)}
              </Chip>
            ))}
          </Flex>

          <Typography weight="medium" size="text-sm">
            Minimum rating
          </Typography>
          <Flex direction="row" gap={1} flexWrap="wrap">
            {[undefined, 4, 4.5].map((r) => (
              <Chip
                key={String(r)}
                selected={minRating === r}
                onPress={() => setMinRating(r)}
              >
                {r == null ? "Any" : `${r}+`}
              </Chip>
            ))}
          </Flex>

          {discovery.nearMe ? (
            <Input
              label="Distance (km)"
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="decimal-pad"
            />
          ) : null}

          <Chip
            selected={accessible}
            onPress={() => setAccessible((v) => !v)}
          >
            Wheelchair accessible
          </Chip>
        </ScrollView>

        <Flex direction="row" gap={1} style={styles.sheetFooter}>
          <Button
            variant="outlined"
            color="secondary"
            style={styles.footerBtn}
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button style={styles.footerBtn} onPress={apply}>
            Apply
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  screen: {
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: space(2),
    paddingTop: space(1),
    paddingBottom: space(1),
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary4,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    gap: space(1),
    alignItems: "center",
  },
  padX: {
    paddingHorizontal: space(2),
  },
  list: {
    paddingHorizontal: space(2),
    paddingBottom: space(4),
  },
  separator: {
    height: space(1.5),
  },
  retry: {
    marginTop: space(1.5),
  },
  footerLoader: {
    marginVertical: space(2),
  },
  sheet: {
    backgroundColor: colors.background,
  },
  sheetHeader: {
    paddingHorizontal: space(2),
    paddingTop: space(2),
  },
  sheetBody: {
    padding: space(2),
    gap: space(2),
    paddingBottom: space(4),
  },
  sheetFooter: {
    padding: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
  },
}));
