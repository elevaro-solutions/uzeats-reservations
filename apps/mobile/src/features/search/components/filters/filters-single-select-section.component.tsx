import type { ReactElement } from "react";

import { Chip, Flex } from "@/components";
import type { IconPropsType } from "@/types";

import { FilterSectionHeader } from "../filter-section-header.component";

export type FilterSingleSelectOption<T> = {
  key: string;
  label: string;
  value: T;
  icon?: ReactElement<IconPropsType>;
};

export type FiltersSingleSelectSectionProps<T> = {
  title: string;
  selectedCount?: number;
  selected: T | undefined | null;
  options: FilterSingleSelectOption<T>[];
  showAny?: boolean;
  onSelectAny?: () => void;
  onSelect: (value: T) => void;
};

export function FiltersSingleSelectSection<T>({
  title,
  selectedCount = 0,
  selected,
  options,
  showAny = true,
  onSelectAny,
  onSelect,
}: FiltersSingleSelectSectionProps<T>) {
  return (
    <Flex gap={1.5}>
      <FilterSectionHeader title={title} selectedCount={selectedCount} />
      <Flex direction="row" gap={1} flexWrap="wrap">
        {showAny ? (
          <Chip selected={selected == null} onPress={() => onSelectAny?.()}>
            Any
          </Chip>
        ) : null}
        {options.map((option) => (
          <Chip
            key={option.key}
            selected={selected === option.value}
            icon={option.icon}
            onPress={() => onSelect(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </Flex>
    </Flex>
  );
}
