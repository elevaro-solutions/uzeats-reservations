import { useCallback, useEffect, useRef } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { Typography } from "../typography";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

const THUMB_TIMING = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const layouts = useRef<Partial<Record<T, { x: number; width: number }>>>({});
  const thumbX = useSharedValue(0);
  const thumbWidth = useSharedValue(0);
  const thumbReady = useSharedValue(0);

  const moveThumb = useCallback(
    (next: T, animate: boolean) => {
      const layout = layouts.current[next];
      if (!layout) return;

      if (animate) {
        thumbX.value = withTiming(layout.x, THUMB_TIMING);
        thumbWidth.value = withTiming(layout.width, THUMB_TIMING);
      } else {
        thumbX.value = layout.x;
        thumbWidth.value = layout.width;
      }
      thumbReady.value = 1;
    },
    [thumbReady, thumbWidth, thumbX],
  );

  useEffect(() => {
    moveThumb(value, true);
  }, [moveThumb, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: thumbReady.value,
    transform: [{ translateX: thumbX.value }],
    width: thumbWidth.value,
  }));

  function handleSegmentLayout(option: T, x: number, width: number) {
    layouts.current[option] = { x, width };
    if (option === value) {
      moveThumb(option, false);
    }
  }

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      <View style={styles.row}>
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, thumbStyle]}
        />
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (option.value !== value) onChange(option.value);
              }}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                handleSegmentLayout(option.value, x, width);
              }}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.segment,
                pressed && !selected ? styles.pressed : null,
              ]}
            >
              <Typography
                weight={selected ? "semibold" : "medium"}
                size="text-sm"
                color={selected ? "textPrimary" : "muted"}
                numberOfLines={1}
                style={styles.label}
              >
                {option.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create(({ space, colors, radius, shadows }) => ({
  track: {
    padding: space(0.5),
    borderRadius: radius.lg,
    backgroundColor: colors.slate2,
    borderWidth: 1,
    borderColor: colors.slate3,
    overflow: "visible",
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "visible",
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate3,
    ...shadows.soft,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space(1),
    paddingHorizontal: space(1),
    zIndex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    textAlign: "center",
  },
}));
