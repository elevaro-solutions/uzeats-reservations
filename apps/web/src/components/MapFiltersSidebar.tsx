'use client';

import type { ReactNode } from 'react';
import { Select, Typography } from 'antd';
import {
  AMENITIES,
  DIETARY_TAGS,
  DINING_STYLES,
  DISCOVERY_OCCASIONS,
  MEALS,
} from '@reservations/shared';
import { colors, typography } from '@reservations/ui';
import { StarFilled, UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type MapDiscoveryFilters = {
  categoryIds: string[];
  priceRange?: number;
  occasions: string[];
  diningStyles: string[];
  meals: string[];
  dietaryTags: string[];
  amenities: string[];
  topRatedOnly: boolean;
  accessibleOnly: boolean;
};

export function countActiveDiscoveryFilters(filters: MapDiscoveryFilters): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count += filters.categoryIds.length;
  if (filters.priceRange != null) count += 1;
  if (filters.occasions.length > 0) count += filters.occasions.length;
  if (filters.diningStyles.length > 0) count += filters.diningStyles.length;
  if (filters.meals.length > 0) count += filters.meals.length;
  if (filters.dietaryTags.length > 0) count += filters.dietaryTags.length;
  if (filters.amenities.length > 0) count += filters.amenities.length;
  if (filters.topRatedOnly) count += 1;
  if (filters.accessibleOnly) count += 1;
  return count;
}

type CategoryFilter = {
  id: string;
  label: string;
  icon: ReactNode;
};

type MapFiltersSidebarProps = {
  categories: CategoryFilter[];
  filters: MapDiscoveryFilters;
  onCategoryIdsChange: (categoryIds: string[]) => void;
  onPriceRangeChange: (priceRange?: number) => void;
  onOccasionsChange: (occasions: string[]) => void;
  onDiningStylesChange: (styles: string[]) => void;
  onMealsChange: (meals: string[]) => void;
  onDietaryTagsChange: (tags: string[]) => void;
  onAmenitiesChange: (amenities: string[]) => void;
  onTopRatedChange: (enabled: boolean) => void;
  onAccessibleChange: (enabled: boolean) => void;
  onClearAll: () => void;
  variant?: 'sidebar' | 'drawer';
  activeFilterCount?: number;
};

const PRICE_OPTIONS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];

const SELECT_PROPS = {
  mode: 'multiple' as const,
  allowClear: true,
  maxTagCount: 'responsive' as const,
  size: 'middle' as const,
  className: 'rt-map-filters__select',
  popupMatchSelectWidth: false,
};

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rt-map-filters__section">
      <Text className="rt-map-filters__section-title">{title}</Text>
      {children}
    </section>
  );
}

function FilterMultiSelect({
  placeholder,
  options,
  value,
  onChange,
  inDrawer = false,
}: {
  placeholder: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  inDrawer?: boolean;
}) {
  return (
    <Select
      {...SELECT_PROPS}
      {...(inDrawer ? { getPopupContainer: (trigger) => trigger.parentElement ?? document.body } : {})}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={options.map((option) => ({ label: option, value: option }))}
    />
  );
}

export function MapFiltersSidebar({
  categories,
  filters,
  onCategoryIdsChange,
  onPriceRangeChange,
  onOccasionsChange,
  onDiningStylesChange,
  onMealsChange,
  onDietaryTagsChange,
  onAmenitiesChange,
  onTopRatedChange,
  onAccessibleChange,
  onClearAll,
  variant = 'sidebar',
  activeFilterCount: activeFilterCountProp,
}: MapFiltersSidebarProps) {
  const hasActiveFilters = (activeFilterCountProp ?? countActiveDiscoveryFilters(filters)) > 0;
  const inDrawer = variant === 'drawer';
  const selectContainerProps = inDrawer
    ? { getPopupContainer: (trigger: HTMLElement) => trigger.parentElement ?? document.body }
    : {};

  return (
    <aside className={variant === 'drawer' ? 'rt-map-filters rt-map-filters--drawer' : 'rt-map-filters'}>
      <div className="rt-map-filters__header">
        <Text strong style={{ fontSize: typography.fontSize.md }}>
          Filters
        </Text>
        {hasActiveFilters ? (
          <button type="button" className="rt-map-page__clear" onClick={onClearAll}>
            Clear all
          </button>
        ) : null}
      </div>

      <div className="rt-map-filters__body">
        <FilterSection title="Quick picks">
          <Select
            {...SELECT_PROPS}
            {...selectContainerProps}
            placeholder="Select quick picks"
            value={filters.categoryIds}
            onChange={onCategoryIdsChange}
            options={categories.map((category) => ({
              label: (
                <span className="rt-map-filters__select-option">
                  <span className="rt-map-filters__category-icon">{category.icon}</span>
                  {category.label}
                </span>
              ),
              value: category.id,
            }))}
          />
        </FilterSection>

        <FilterSection title="Occasion">
          <FilterMultiSelect
            inDrawer={inDrawer}
            placeholder="Select occasions"
            options={DISCOVERY_OCCASIONS}
            value={filters.occasions}
            onChange={onOccasionsChange}
          />
        </FilterSection>

        <FilterSection title="Dining style">
          <FilterMultiSelect
            inDrawer={inDrawer}
            placeholder="Select dining styles"
            options={DINING_STYLES}
            value={filters.diningStyles}
            onChange={onDiningStylesChange}
          />
        </FilterSection>

        <FilterSection title="Meal">
          <FilterMultiSelect
            inDrawer={inDrawer}
            placeholder="Select meals"
            options={MEALS}
            value={filters.meals}
            onChange={onMealsChange}
          />
        </FilterSection>

        <FilterSection title="Dietary">
          <FilterMultiSelect
            inDrawer={inDrawer}
            placeholder="Select dietary options"
            options={DIETARY_TAGS}
            value={filters.dietaryTags}
            onChange={onDietaryTagsChange}
          />
        </FilterSection>

        <FilterSection title="Amenities">
          <FilterMultiSelect
            inDrawer={inDrawer}
            placeholder="Select amenities"
            options={AMENITIES}
            value={filters.amenities}
            onChange={onAmenitiesChange}
          />
        </FilterSection>

        <FilterSection title="Price">
          <div className="rt-map-filters__price-row">
            {PRICE_OPTIONS.map((option) => {
              const active = filters.priceRange === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={active ? 'rt-map-filters__price rt-map-filters__price--active' : 'rt-map-filters__price'}
                  onClick={() => onPriceRangeChange(active ? undefined : option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title="More">
          <div className="rt-map-filters__list">
            <button
              type="button"
              className={filters.topRatedOnly ? 'rt-map-filters__chip rt-map-filters__chip--active' : 'rt-map-filters__chip'}
              onClick={() => onTopRatedChange(!filters.topRatedOnly)}
            >
              <span className="rt-map-filters__chip-icon">
                <StarFilled style={{ color: colors.rating }} />
              </span>
              <span>Top rated (4.5+)</span>
            </button>
            <button
              type="button"
              className={filters.accessibleOnly ? 'rt-map-filters__chip rt-map-filters__chip--active' : 'rt-map-filters__chip'}
              onClick={() => onAccessibleChange(!filters.accessibleOnly)}
            >
              <span className="rt-map-filters__chip-icon">
                <UserOutlined />
              </span>
              <span>Wheelchair accessible</span>
            </button>
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
