import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Chip, SegmentedControl, type SegmentedControlOption } from "@/components";

export const FLOOR_AREA_ALL = "__all__";

export type FloorAreaFilterProps = {
  areas: string[];
  value: string;
  onChange: (area: string) => void;
};

export function FloorAreaFilter({ areas, value, onChange }: FloorAreaFilterProps) {
  if (areas.length < 2) return null;

  if (areas.length <= 3) {
    const options: SegmentedControlOption<string>[] = [
      { value: FLOOR_AREA_ALL, label: "All" },
      ...areas.map((area) => ({ value: area, label: area })),
    ];
    return (
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        style={styles.segmented}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      <Chip
        size="sm"
        selected={value === FLOOR_AREA_ALL}
        onPress={() => onChange(FLOOR_AREA_ALL)}
      >
        All
      </Chip>
      {areas.map((area) => (
        <Chip
          key={area}
          size="sm"
          selected={value === area}
          onPress={() => onChange(area)}
        >
          {area}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  segmented: {
    alignSelf: "stretch",
  },
  chips: {
    flexDirection: "row",
    gap: space(1.25),
    paddingVertical: space(0.5),
    paddingRight: space(1),
  },
}));
