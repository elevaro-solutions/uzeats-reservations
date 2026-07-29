'use client';

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import {
  CrownOutlined,
  DollarOutlined,
  StarFilled,
  UserOutlined,
} from '@ant-design/icons';
import { colors, radii, typography } from '@reservations/ui';

const { Text } = Typography;

type CategoryFilter = {
  id: string;
  label: string;
  icon: ReactNode;
};

export type MapDiscoveryFilters = {
  activeCategoryId?: string;
  priceRange?: number;
  topRatedOnly: boolean;
  accessibleOnly: boolean;
};

type MapFiltersSidebarProps = {
  categories: CategoryFilter[];
  filters: MapDiscoveryFilters;
  onCategorySelect: (categoryId: string) => void;
  onPriceRangeChange: (priceRange?: number) => void;
  onTopRatedChange: (enabled: boolean) => void;
  onAccessibleChange: (enabled: boolean) => void;
  onClearAll: () => void;
};

const PRICE_OPTIONS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rt-map-filters__section">
      <Text className="rt-map-filters__section-title">{title}</Text>
      {children}
    </section>
  );
}

export function MapFiltersSidebar({
  categories,
  filters,
  onCategorySelect,
  onPriceRangeChange,
  onTopRatedChange,
  onAccessibleChange,
  onClearAll,
}: MapFiltersSidebarProps) {
  const hasActiveFilters =
    Boolean(filters.activeCategoryId) ||
    filters.priceRange != null ||
    filters.topRatedOnly ||
    filters.accessibleOnly;

  return (
    <aside className="rt-map-filters">
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
        <FilterSection title="Categories">
          <div className="rt-map-filters__categories">
            {categories.map((category) => {
              const active = filters.activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={active ? 'rt-map-filters__category rt-map-filters__category--active' : 'rt-map-filters__category'}
                  onClick={() => onCategorySelect(category.id)}
                  title={category.label}
                >
                  <span className="rt-map-filters__category-icon">{category.icon}</span>
                  <span className="rt-map-filters__category-label">{category.label}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title="Pricing">
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
              <span>Accessible seating</span>
            </button>
            <button
              type="button"
              className="rt-map-filters__chip rt-map-filters__chip--muted"
              disabled
              title="Coming soon"
            >
              <span className="rt-map-filters__chip-icon">
                <CrownOutlined />
              </span>
              <span>Featured picks</span>
            </button>
            <button
              type="button"
              className="rt-map-filters__chip rt-map-filters__chip--muted"
              disabled
              title="Coming soon"
            >
              <span className="rt-map-filters__chip-icon">
                <DollarOutlined />
              </span>
              <span>Special offers</span>
            </button>
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
