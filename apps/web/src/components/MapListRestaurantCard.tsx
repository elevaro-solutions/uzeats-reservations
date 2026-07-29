'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Rate, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { colors, priceRangeLabel, radii, shadows, typography, pickRestaurantPhoto, restaurantPhotoCandidates } from '@reservations/ui';
import { AVAILABILITY } from '@/lib/graphql';
import type { MapRestaurant } from './RestaurantDiscoveryMap';

const { Text } = Typography;

type MapListRestaurantCardProps = {
  restaurant: MapRestaurant;
  date: string;
  partySize: number;
  active: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onSelectSlot: (time: string) => void;
};

export function MapListRestaurantCard({
  restaurant,
  date,
  partySize,
  active,
  onSelect,
  onOpen,
  onSelectSlot,
}: MapListRestaurantCardProps) {
  const { data } = useQuery(AVAILABILITY, {
    variables: { restaurantId: restaurant.id, date, partySize },
  });

  const slots = useMemo(
    () =>
      ((data as any)?.availability ?? [])
        .filter((s: any) => s.available)
        .slice(0, 3)
        .map((s: any) => s.time),
    [data],
  );

  const photoCandidates = useMemo(
    () => restaurantPhotoCandidates(restaurant.photos),
    [restaurant.photos],
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = photoCandidates[Math.min(photoIndex, photoCandidates.length - 1)] ?? pickRestaurantPhoto();

  useEffect(() => {
    setPhotoIndex(0);
  }, [restaurant.id, restaurant.photos]);
  const rating = restaurant.averageRating ?? 0;
  const reviewCount = restaurant.reviewCount ?? 0;

  return (
    <article
      className={`rt-map-list-card${active ? ' rt-map-list-card--active' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="rt-map-list-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={restaurant.name}
          loading="lazy"
          decoding="async"
          onError={() => {
            setPhotoIndex((current) => Math.min(current + 1, photoCandidates.length - 1));
          }}
        />
      </div>

      <div className="rt-map-list-card__body">
        <button type="button" className="rt-map-list-card__title" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          {restaurant.name}
        </button>

        {reviewCount > 0 && (
          <div className="rt-map-list-card__rating">
            <Rate disabled allowHalf value={rating} style={{ fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
              {rating.toFixed(1)} ({reviewCount.toLocaleString()})
            </Text>
          </div>
        )}

        <Text type="secondary" className="rt-map-list-card__meta">
          {priceRangeLabel(restaurant.priceRange ?? 2)} · {restaurant.cuisine}
        </Text>

        <div className="rt-map-list-card__location">
          <EnvironmentOutlined />
          <span>
            {restaurant.address?.city}
            {restaurant.address?.state ? `, ${restaurant.address.state}` : ''}
          </span>
        </div>

        {slots.length > 0 ? (
          <div className="rt-map-list-card__slots">
            {slots.map((slot: string) => (
              <button
                key={slot}
                type="button"
                className="rt-map-list-card__slot"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSlot(slot);
                }}
              >
                {new Date(slot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="rt-map-list-card__cta"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Check availability
          </button>
        )}
      </div>
    </article>
  );
}
