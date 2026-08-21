'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import { typography } from '@reservations/ui';
import { DiscoveryFiltersDrawer } from './DiscoveryFiltersDrawer';
import { RestaurantDiscoveryMap } from './RestaurantDiscoveryMap';
import { MapListRestaurantCard } from './MapListRestaurantCard';
import { LoadMoreButton } from './LoadMoreButton';

const { Text } = Typography;

type MapResultsLayoutProps = {
  restaurants: any[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  date: string;
  partySize: number;
  total: number;
  resultsTitle: string;
  activeCategoryLabel?: string;
  filtersSidebar: ReactNode;
  filtersDrawerContent?: ReactNode;
  activeFilterCount?: number;
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  onSelectRestaurant: (id: string) => void;
  onCloseRestaurant: () => void;
  onOpenRestaurant: (id: string) => void;
  onSelectSlot: (id: string, time: string) => void;
  onClearCategory?: () => void;
  emptyContent?: ReactNode;
};

export function MapResultsLayout({
  restaurants,
  center,
  selectedId,
  date,
  partySize,
  total,
  resultsTitle,
  activeCategoryLabel,
  filtersSidebar,
  filtersDrawerContent,
  activeFilterCount = 0,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelectRestaurant,
  onCloseRestaurant,
  onOpenRestaurant,
  onSelectSlot,
  onClearCategory,
  emptyContent,
}: MapResultsLayoutProps) {
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!selectedId) return;
    const frame = window.requestAnimationFrame(() => {
      cardRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);

  const drawerContent = filtersDrawerContent ?? filtersSidebar;

  return (
    <div className="rt-map-page__split">
      <div className="rt-filters-desktop">{filtersSidebar}</div>

      <section className="rt-map-page__list-panel">
        <div className="rt-map-page__list-header">
          <div className="rt-map-page__list-header-top">
            <Text strong style={{ fontSize: typography.fontSize.lg, display: 'block' }}>
              {total.toLocaleString()} restaurant{total === 1 ? '' : 's'} available
            </Text>
            <DiscoveryFiltersDrawer
              filtersContent={drawerContent}
              activeFilterCount={activeFilterCount}
              onClearAll={onClearCategory}
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
            {activeFilterCount > 0 && onClearCategory ? (
              <>
                {activeCategoryLabel ? '. ' : ' · '}
                <button type="button" className="rt-map-page__clear" onClick={onClearCategory}>
                  Clear filters
                </button>
              </>
            ) : null}
          </Text>
        </div>

        <div className="rt-map-page__list">
          {restaurants.length === 0 && emptyContent ? (
            emptyContent
          ) : (
            <>
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  ref={(el) => {
                    cardRefs.current[restaurant.id] = el;
                  }}
                >
                  <MapListRestaurantCard
                    restaurant={restaurant}
                    date={date}
                    partySize={partySize}
                    active={selectedId === restaurant.id}
                    onSelect={() => onSelectRestaurant(restaurant.id)}
                    onOpen={() => onOpenRestaurant(restaurant.id)}
                    onSelectSlot={(time) => onSelectSlot(restaurant.id, time)}
                  />
                </div>
              ))}
              <LoadMoreButton onLoadMore={onLoadMore} hasMore={hasMore} loading={loadingMore} />
            </>
          )}
        </div>
      </section>

      <div className="rt-map-page__map-panel">
        <RestaurantDiscoveryMap
          restaurants={restaurants}
          center={center}
          selectedId={selectedId}
          date={date}
          partySize={partySize}
          onSelectRestaurant={onSelectRestaurant}
          onCloseRestaurant={onCloseRestaurant}
          onOpenRestaurant={onOpenRestaurant}
          onSelectSlot={onSelectSlot}
          fullPage
        />
      </div>
    </div>
  );
}
