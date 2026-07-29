'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Pagination, Typography } from 'antd';
import { typography } from '@reservations/ui';
import { RestaurantDiscoveryMap } from './RestaurantDiscoveryMap';
import { MapListRestaurantCard } from './MapListRestaurantCard';

const { Text } = Typography;

type MapResultsLayoutProps = {
  restaurants: any[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  date: string;
  partySize: number;
  total: number;
  page: number;
  pageSize: number;
  resultsTitle: string;
  activeCategoryLabel?: string;
  filtersSidebar: ReactNode;
  onPageChange: (page: number) => void;
  onSelectRestaurant: (id: string) => void;
  onCloseRestaurant: () => void;
  onOpenRestaurant: (id: string) => void;
  onSelectSlot: (id: string, time: string) => void;
  onClearCategory?: () => void;
};

export function MapResultsLayout({
  restaurants,
  center,
  selectedId,
  date,
  partySize,
  total,
  page,
  pageSize,
  resultsTitle,
  activeCategoryLabel,
  filtersSidebar,
  onPageChange,
  onSelectRestaurant,
  onCloseRestaurant,
  onOpenRestaurant,
  onSelectSlot,
  onClearCategory,
}: MapResultsLayoutProps) {
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="rt-map-page__split">
      {filtersSidebar}

      <section className="rt-map-page__list-panel">
        <div className="rt-map-page__list-header">
          <Text strong style={{ fontSize: typography.fontSize.lg, display: 'block' }}>
            {total.toLocaleString()} restaurant{total === 1 ? '' : 's'} available
          </Text>
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            {resultsTitle}
            {activeCategoryLabel ? (
              <>
                {' '}
                · Showing <strong>{activeCategoryLabel}</strong>
                {onClearCategory ? (
                  <>
                    .{' '}
                    <button type="button" className="rt-map-page__clear" onClick={onClearCategory}>
                      Clear filters
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </Text>
        </div>

        <div className="rt-map-page__list">
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
        </div>

        {total > pageSize && (
          <div className="rt-map-page__pagination">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={onPageChange}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
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
