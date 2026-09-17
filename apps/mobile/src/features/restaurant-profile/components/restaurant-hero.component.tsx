import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  type ViewToken,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Flex, RemoteImage, Typography } from "@/components";

export type RestaurantHeroProps = {
  name: string;
  photos?: string[] | null;
  /** Safe-area top inset so the photo plane clears the status bar / overlay chrome. */
  topInset?: number;
};

export function RestaurantHero({
  name,
  photos,
  topInset = 0,
}: RestaurantHeroProps) {
  const { theme } = useUnistyles();
  const width = Dimensions.get("window").width;
  const height = theme.space(40) + topInset;
  const items = (photos ?? []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  function onViewableItemsChanged({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }

  function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  if (items.length === 0) {
    return (
      <Flex
        style={[styles.heroPlaceholder, { height }]}
        justifyContent="center"
        alignItems="center"
      >
        <Typography color="muted">No photo</Typography>
      </Flex>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <FlatList
        data={items}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item, index }) => (
          <RemoteImage
            uri={item}
            style={{ width, height }}
            priority="high"
            recyclingKey={`${item}-${index}`}
            accessibilityLabel={name}
          />
        )}
      />
      {items.length > 1 ? (
        <Flex direction="row" gap={0.75} style={styles.dots}>
          {items.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </Flex>
      ) : null}
      {items.length > 0 ? (
        <View
          style={styles.count}
          accessibilityLabel={`${items.length} ${items.length === 1 ? "photo" : "photos"}`}
        >
          <Typography color="inverse" size="text-xs" weight="semibold">
            {index + 1} / {items.length}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  wrap: {
    width: "100%",
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    width: "100%",
    backgroundColor: colors.surface,
  },
  dots: {
    position: "absolute",
    bottom: space(3.5),
    alignSelf: "center",
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    right: space(2),
    bottom: space(2),
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.75),
    borderRadius: radius.full,
    backgroundColor: colors.overlay,
  },
  dot: {
    width: space(0.75),
    height: space(0.75),
    borderRadius: radius.full,
    backgroundColor: colors.white,
    opacity: 0.45,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: colors.primary,
    width: space(1.5),
  },
}));
