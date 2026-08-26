import { View } from "react-native";
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
  return <View style={[styles.bone, { width, height }]} />;
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
