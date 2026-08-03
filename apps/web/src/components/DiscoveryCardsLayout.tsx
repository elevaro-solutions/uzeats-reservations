'use client';

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { typography } from '@reservations/ui';
import { DiscoveryFiltersDrawer } from './DiscoveryFiltersDrawer';
import { InfiniteScrollSentinel } from './InfiniteScrollSentinel';
import { StickyFiltersSidebar } from './StickyFiltersSidebar';

const { Text } = Typography;

type DiscoveryCardsLayoutProps = {
  filtersSidebar: ReactNode;
  filtersDrawerContent?: ReactNode;
  activeFilterCount?: number;
  total: number;
  resultsTitle: string;
  activeCategoryLabel?: string;
  onClearFilters?: () => void;
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  scrollRoot?: Element | null;
  children: ReactNode;
};

export function DiscoveryCardsLayout({
  filtersSidebar,
  filtersDrawerContent,
  activeFilterCount = 0,
  total,
  resultsTitle,
  activeCategoryLabel,
  onClearFilters,
  hasMore,
  loadingMore,
  onLoadMore,
  scrollRoot,
  children,
}: DiscoveryCardsLayoutProps) {
  const drawerContent = filtersDrawerContent ?? filtersSidebar;

  return (
    <div className="rt-cards-page__split">
      <StickyFiltersSidebar>{filtersSidebar}</StickyFiltersSidebar>

      <section className="rt-cards-page__main">
        <div className="rt-cards-page__header">
          <div className="rt-cards-page__header-top">
            <Text strong style={{ fontSize: typography.fontSize.lg, display: 'block' }}>
              {total.toLocaleString()} restaurant{total === 1 ? '' : 's'} available
            </Text>
            <DiscoveryFiltersDrawer
              filtersContent={drawerContent}
              activeFilterCount={activeFilterCount}
              onClearAll={onClearFilters}
            />
          </div>
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            {resultsTitle}
            {activeCategoryLabel ? (
              <>
                {' '}
                · Showing <strong>{activeCategoryLabel}</strong>
              </>
            ) : null}
            {activeFilterCount > 0 && onClearFilters ? (
              <>
                {activeCategoryLabel ? '. ' : ' · '}
                <button type="button" className="rt-map-page__clear" onClick={onClearFilters}>
                  Clear filters
                </button>
              </>
            ) : null}
          </Text>
        </div>

        <div className="rt-cards-page__content">
          {children}
          <InfiniteScrollSentinel
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            loading={loadingMore}
            root={scrollRoot}
          />
        </div>
      </section>
    </div>
  );
}
