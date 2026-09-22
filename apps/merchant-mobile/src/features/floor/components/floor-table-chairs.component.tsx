import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export type FloorTableChairsProps = {
  count: number;
  axis: "horizontal" | "vertical";
  color: string;
};

export function FloorTableChairs({
  count,
  axis,
  color,
}: FloorTableChairsProps) {
  if (count <= 0) return null;
  return (
    <View
      style={axis === "horizontal" ? styles.chairRow : styles.chairCol}
      pointerEvents="none"
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={`${axis}-${i}`}
          style={[
            axis === "horizontal" ? styles.chairH : styles.chairV,
            { backgroundColor: color },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create(({ space, radius }) => ({
  chairRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
  },
  chairCol: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space(1.25),
  },
  chairH: {
    width: 26,
    height: 9,
    borderRadius: radius.full,
  },
  chairV: {
    width: 9,
    height: 26,
    borderRadius: radius.full,
  },
}));
