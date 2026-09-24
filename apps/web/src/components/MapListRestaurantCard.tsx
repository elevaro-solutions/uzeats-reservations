'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Rate, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { formatTimeInTimeZone, timezoneFromAddress } from '@reservations/shared';
import { priceRangeLabel, typography, pickRestaurantPhoto, restaurantPhotoCandidates } from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';
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
  active,
  onSelect,
  onOpen,
  onSelectSlot,
}: MapListRestaurantCardProps) {
  const slots = restaurant.availableSlotTimes?.slice(0, 3) ?? [];

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
        {canUseNextImage(photo) ? (
          <Image
            src={photo}
            alt={restaurant.name}
            fill
            sizes="120px"
            style={{ objectFit: 'cover' }}
            onError={() => {
              setPhotoIndex((current) => Math.min(current + 1, photoCandidates.length - 1));
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={restaurant.name}
            loading="lazy"
            decoding="async"
            onError={() => {
              setPhotoIndex((current) => Math.min(current + 1, photoCandidates.length - 1));
            }}
          />
        )}
      </div>

      <div className="rt-map-list-card__body">
        <button type="button" className="rt-map-list-card__title" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          {restaurant.name}
        </button>

        {reviewCount > 0 && (
          <div className="rt-map-list-card__rating">
            <Rate disabled allowHalf value={rating} style={{ fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
              {rating.toFixed(1)} ({reviewCount.toLocaleString('en-US')})
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
                {formatTimeInTimeZone(slot, timezoneFromAddress({ state: restaurant.address?.state }))}
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
