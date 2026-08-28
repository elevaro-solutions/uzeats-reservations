import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: "sm" | "md" | "lg" | "full";
};

export function Skeleton({
  width = "100%",
  height = 16,
  radius = "md",
}: SkeletonProps) {
  styles.useVariants({ corners: radius });
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.bone, { width, height }, animatedStyle]} />
  );
}

const styles = StyleSheet.create((theme) => ({
  bone: {
    backgroundColor: theme.colors.slate3,
    variants: {
      corners: {
        sm: { borderRadius: theme.radius.sm },
        md: { borderRadius: theme.radius.md },
        lg: { borderRadius: theme.radius.lg },
        full: { borderRadius: theme.radius.full },
      },
    },
  },
}));
