import { useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Typography } from "@/components";
import { MAX_BOOKABLE_PARTY_SIZE } from "@/lib/party-size";

const MIN_PARTY = 1;
const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;

const PARTY_VALUES = Array.from(
  { length: MAX_BOOKABLE_PARTY_SIZE - MIN_PARTY + 1 },
  (_, index) => MIN_PARTY + index,
);

export type PartySizeWheelPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

export function PartySizeWheelPicker({
  value,
  onChange,
}: PartySizeWheelPickerProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScrollRef = useRef(false);
  const paddingRows = Math.floor(VISIBLE_ROWS / 2);

  useEffect(() => {
    isProgrammaticScrollRef.current = true;
    const index = Math.max(0, Math.min(PARTY_VALUES.length - 1, value - MIN_PARTY));
    scrollRef.current?.scrollTo({
      y: index * ROW_HEIGHT,
      animated: false,
    });
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [value]);

  function syncValueFromOffset(offsetY: number) {
    if (isProgrammaticScrollRef.current) return;

    const index = Math.round(offsetY / ROW_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(PARTY_VALUES.length - 1, index));
    const nextValue = PARTY_VALUES[clampedIndex]!;
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncValueFromOffset(event.nativeEvent.contentOffset.y);
  }

  function selectValue(nextValue: number) {
    onChange(nextValue);
    isProgrammaticScrollRef.current = true;
    scrollRef.current?.scrollTo({
      y: (nextValue - MIN_PARTY) * ROW_HEIGHT,
      animated: true,
    });
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }

  const wheelHeight = ROW_HEIGHT * VISIBLE_ROWS;

  return (
    <View style={[styles.container, { height: wheelHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.selectionBand,
          {
            top: paddingRows * ROW_HEIGHT,
            height: ROW_HEIGHT,
            borderColor: theme.colors.border,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.fadeTop,
          { height: paddingRows * ROW_HEIGHT, backgroundColor: theme.colors.background },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.fadeBottom,
          {
            height: paddingRows * ROW_HEIGHT,
            backgroundColor: theme.colors.background,
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingVertical: paddingRows * ROW_HEIGHT,
        }}
      >
        {PARTY_VALUES.map((size) => {
          const selected = size === value;
          return (
            <Pressable
              key={size}
              onPress={() => selectValue(size)}
              style={[styles.row, { height: ROW_HEIGHT }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${size} guests`}
            >
              <Typography
                weight={selected ? "semibold" : "regular"}
                size={selected ? "text-lg" : "text-md"}
                color={selected ? "primary" : "secondary"}
              >
                {size} guest{size === 1 ? "" : "s"}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  selectionBand: {
    position: "absolute",
    left: space(2),
    right: space(2),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.72,
    zIndex: 2,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.72,
    zIndex: 2,
  },
  row: {
    alignItems: "center",
    justifyContent: "center",
  },
}));
