import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Typography } from "@/components";

import type { ProfileSectionTab } from "../types";

export type RestaurantSectionTabsProps = {
  tabs: ProfileSectionTab[];
  active: ProfileSectionTab;
  onChange: (tab: ProfileSectionTab) => void;
};

const LABELS: Record<ProfileSectionTab, string> = {
  details: "Details",
  menu: "Menu",
  reviews: "Reviews",
  photos: "Photos",
};

const INDICATOR_TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

export function RestaurantSectionTabs({
  tabs,
  active,
  onChange,
}: RestaurantSectionTabsProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<
    Partial<Record<ProfileSectionTab, { x: number; width: number }>>
  >({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorReady = useSharedValue(0);

  const moveIndicator = useCallback(
    (tab: ProfileSectionTab, animate: boolean) => {
      const layout = tabLayouts.current[tab];
      if (!layout) return;

      if (animate) {
        indicatorX.value = withTiming(layout.x, INDICATOR_TIMING);
        indicatorWidth.value = withTiming(layout.width, INDICATOR_TIMING);
      } else {
        indicatorX.value = layout.x;
        indicatorWidth.value = layout.width;
      }
      indicatorReady.value = 1;

      scrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - theme.space(2)),
        animated: animate,
      });
    },
    [indicatorReady, indicatorWidth, indicatorX, theme],
  );

  useEffect(() => {
    moveIndicator(active, true);
  }, [active, moveIndicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorReady.value,
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  function handleTabLayout(tab: ProfileSectionTab, x: number, width: number) {
    tabLayouts.current[tab] = { x, width };
    if (tab === active) {
      moveIndicator(tab, false);
    }
  }

  return (
    <View style={styles.container} accessibilityRole="tablist">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <View
              key={tab}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                handleTabLayout(tab, x, width);
              }}
            >
              <Pressable
                onPress={() => onChange(tab)}
                accessibilityRole="tab"
                accessibilityLabel={LABELS[tab]}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.tab,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Typography
                  weight={isActive ? "semibold" : "medium"}
                  size="text-sm"
                  color={isActive ? "textPrimary" : "muted"}
                >
                  {LABELS[tab]}
                </Typography>
              </Pressable>
            </View>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius }) => ({
  container: {
    marginHorizontal: -space(2),
    marginTop: space(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.slate3,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    paddingHorizontal: space(2),
    gap: space(2),
  },
  tab: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: space(1.5),
    paddingHorizontal: space(1),
  },
  pressed: {
    opacity: 0.72,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
  },
}));
