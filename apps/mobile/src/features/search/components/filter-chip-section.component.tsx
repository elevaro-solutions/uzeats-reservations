import { createElement, useState, type ComponentType } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Chip, Flex, Typography } from "@/components";
import {
  ChipRowSkeleton,
  FILTER_CHIP_WIDTHS,
} from "@/components/skeleton";
import type { IconPropsType } from "@/types";

import { FilterSectionHeader } from "./filter-section-header.component";

const COLLAPSED_MAX_HEIGHT = 92;

export type FilterChipSectionOption = {
  key: string;
  label: string;
  Icon?: ComponentType<IconPropsType>;
};

export type FilterChipSectionProps = {
  title: string;
  options: FilterChipSectionOption[];
  selected: string[];
  loading?: boolean;
  onToggle: (value: string) => void;
  isSelected?: (value: string) => boolean;
};

export function FilterChipSection({
  title,
  options,
  selected,
  loading = false,
  onToggle,
  isSelected,
}: FilterChipSectionProps) {
  const { theme } = useUnistyles();
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  if (!loading && options.length === 0) return null;

  const selectedCount = options.filter((option) =>
    isSelected ? isSelected(option.label) : selected.includes(option.label),
  ).length;

  const canCollapse = contentHeight > COLLAPSED_MAX_HEIGHT + 4;
  const showCollapsed = canCollapse && !expanded;

  function handleLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      setContentHeight(nextHeight);
    }
  }

  return (
    <Flex gap={1}>
      <FilterSectionHeader title={title} selectedCount={selectedCount} />

      {loading && options.length === 0 ? (
        <ChipRowSkeleton widths={FILTER_CHIP_WIDTHS} wrap />
      ) : (
        <>
          <View
            style={[styles.chipWrap, showCollapsed ? styles.collapsed : null]}
          >
            <View onLayout={handleLayout} style={styles.chipInner}>
              <Flex direction="row" gap={1} flexWrap="wrap">
                {options.map((option) => {
                  const active = isSelected
                    ? isSelected(option.label)
                    : selected.includes(option.label);
                  const Icon = option.Icon;
                  return (
                    <Chip
                      key={option.key}
                      selected={active}
                      icon={
                        Icon
                          ? createElement(Icon, {
                              size: 16,
                              color: active
                                ? theme.colors.white
                                : theme.colors.textPrimary,
                            })
                          : undefined
                      }
                      onPress={() => onToggle(option.label)}
                    >
                      {option.label}
                    </Chip>
                  );
                })}
              </Flex>
            </View>
          </View>

          {canCollapse ? (
            <Pressable
              onPress={() => setExpanded((current) => !current)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? "Show less options" : `Show all ${options.length} options`
              }
              style={styles.toggle}
            >
              <Typography size="text-sm" weight="semibold" color="primary">
                {expanded ? "Show less" : `Show all (${options.length})`}
              </Typography>
            </Pressable>
          ) : null}
        </>
      )}
    </Flex>
  );
}

const styles = StyleSheet.create(({ space }) => ({
  chipWrap: {
    overflow: "hidden",
  },
  chipInner: {
    width: "100%",
  },
  collapsed: {
    maxHeight: COLLAPSED_MAX_HEIGHT,
  },
  toggle: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingVertical: space(1),
    marginTop: space(0.25),
  },
}));
