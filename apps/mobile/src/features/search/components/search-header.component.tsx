import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronLeftIcon, SearchIcon, XIcon } from "@/assets";
import { Button, Flex, Input, Typography } from "@/components";

export type SearchHeaderProps = {
  queryDraft: string;
  onChangeQuery: (value: string) => void;
  onClearQuery: () => void;
  onSubmitSearch: () => void;
  locationLabel: string;
  onLocationPress?: () => void;
  showSearchButton: boolean;
};

export function SearchHeader({
  queryDraft,
  onChangeQuery,
  onClearQuery,
  onSubmitSearch,
  locationLabel,
  onLocationPress,
  showSearchButton,
}: SearchHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.titleRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.back,
            pressed && styles.backPressed,
          ]}
        >
          <ChevronLeftIcon size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.titleBlock} pointerEvents="box-none">
          <Typography size="text-xl" weight="bold" align="center" numberOfLines={1}>
            Search
          </Typography>
          {onLocationPress ? (
            <Pressable
              onPress={onLocationPress}
              style={styles.locationPressable}
              accessibilityRole="button"
              accessibilityLabel="Change search location"
            >
              <Typography
                size="text-xs"
                color="secondary"
                align="center"
                numberOfLines={1}
              >
                {locationLabel}
              </Typography>
            </Pressable>
          ) : (
            <Typography
              size="text-xs"
              color="secondary"
              align="center"
              numberOfLines={1}
            >
              {locationLabel}
            </Typography>
          )}
        </View>

        {/* Balances the back button so the title stays optically centered */}
        <View style={styles.sideSlot} />
      </View>

      <Flex direction="row" gap={1} alignItems="center" style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Input
            value={queryDraft}
            onChangeText={onChangeQuery}
            placeholder="Search restaurants…"
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
            size="lg"
            onSubmitEditing={onSubmitSearch}
            style={styles.searchField(theme.colors.surface)}
            placeholderTextColor={theme.colors.slate10}
            prefix={<SearchIcon size={18} color={theme.colors.slate10} />}
            suffix={
              queryDraft.length > 0 ? (
                <Pressable
                  onPress={onClearQuery}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <XIcon size={16} color={theme.colors.textMuted} />
                </Pressable>
              ) : null
            }
          />
        </View>

        {showSearchButton ? (
          <View style={styles.noShrink}>
            <Button size="xl" onPress={onSubmitSearch} style={styles.searchButton}>
              Search
            </Button>
          </View>
        ) : null}
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius, colors }) => ({
  wrap: {
    paddingHorizontal: space(2),
    paddingBottom: space(1.5),
    gap: space(2.5),
  },
  titleRow: {
    width: "100%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleBlock: {
    position: "absolute",
    left: space(6),
    right: space(6),
    alignItems: "center",
    gap: space(0.25),
  },
  locationPressable: {
    maxWidth: "100%",
  },
  sideSlot: {
    width: 40,
    height: 40,
  },
  searchRow: {
    width: "100%",
  },
  noShrink: {
    flexShrink: 0,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  backPressed: {
    backgroundColor: colors.slate3,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchField: (surface: string) => ({
    backgroundColor: surface,
    borderWidth: 0,
  }),
  searchButton: {
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: space(2),
  },
}));
