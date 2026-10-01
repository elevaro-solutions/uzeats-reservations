import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  type LayoutChangeEvent,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
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
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

/**
 * Equal-width segmented control.
 *
 * Performance notes:
 * - `value` is the single source of truth; there is no duplicate `selected`
 *   React state to keep in sync.
 * - The thumb lives entirely on the UI thread. Only `translateX` animates
 *   (segments are equal-width, so the thumb `width` is set once) which keeps the
 *   drop shadow cached and avoids per-frame layout.
 * - A tap retargets the pill in the gesture `onBegin` worklet, so it slides
 *   instantly even while the JS thread commits `onChange` / re-renders the pane.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const count = options.length;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Track width feeds the equal-width segment math; `progress` is the animated
  // index the thumb is resting at / sliding toward (both live on the UI thread).
  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(selectedIndex);
  const selectedSv = useSharedValue(selectedIndex);

  // Keep latest `value` / `onChange` on refs so the gesture objects can stay
  // stable across renders instead of being rebuilt on every tab change.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const commit = useCallback((next: T) => {
    if (next !== valueRef.current) onChangeRef.current(next);
  }, []);

  // External `value` changes (and first mount) retarget the thumb; also mirror
  // the selected index onto the UI thread for cancel-restore.
  useEffect(() => {
    selectedSv.value = selectedIndex;
    progress.value = withTiming(selectedIndex, THUMB_TIMING);
  }, [selectedIndex, progress, selectedSv]);

  const optionsKey = options.map((option) => option.value).join("|");
  const gestures = useMemo(
    () =>
      options.map((option, index) =>
        Gesture.Tap()
          .maxDuration(10_000)
          .onBegin(() => {
            "worklet";
            progress.value = withTiming(index, THUMB_TIMING);
          })
          .onEnd(() => {
            "worklet";
            runOnJS(commit)(option.value);
          })
          .onFinalize((_event, success) => {
            "worklet";
            if (!success) {
              progress.value = withTiming(selectedSv.value, THUMB_TIMING);
            }
          }),
      ),
    // `optionsKey` captures option identity without depending on array identity
    // (some callers pass an inline `options` array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsKey, commit, progress, selectedSv],
  );

  const onRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const segmentWidth = count > 0 ? trackWidth.value / count : 0;
    return {
      width: segmentWidth,
      opacity: trackWidth.value > 0 ? 1 : 0,
      transform: [{ translateX: progress.value * segmentWidth }],
    };
  });

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      <View style={styles.row} onLayout={onRowLayout}>
        <Animated.View pointerEvents="none" style={[styles.thumb, thumbStyle]} />
        {options.map((option, index) => (
          <GestureDetector key={option.value} gesture={gestures[index]}>
            <Segment
              label={option.label}
              selected={option.value === value}
            />
          </GestureDetector>
        ))}
      </View>
    </View>
  );
}

type SegmentProps = {
  label: string;
  selected: boolean;
};

const Segment = memo(function Segment({ label, selected }: SegmentProps) {
  return (
    <View
      accessible
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={styles.segment}
    >
      <Typography
        weight={selected ? "semibold" : "medium"}
        size="text-sm"
        color={selected ? "textPrimary" : "muted"}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </Typography>
    </View>
  );
});

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
  label: {
    textAlign: "center",
  },
}));
