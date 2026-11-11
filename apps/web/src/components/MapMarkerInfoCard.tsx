'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  CloseOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
  StarFilled,
} from '@ant-design/icons';
import { formatTimeInTimeZone, timezoneFromAddress } from '@reservations/shared';
import { priceRangeLabel, typography } from '@reservations/ui';
import { canUseNextImage } from '@/lib/canUseNextImage';
import type { MapRestaurant } from './RestaurantDiscoveryMap';

type MapMarkerInfoCardProps = {
  restaurant: MapRestaurant;
  date: string;
  partySize: number;
  onClose: () => void;
  onOpen: () => void;
  onSelectSlot: (time: string) => void;
};

function formatSlotTime(slot: string, state?: string): string {
  const timeZone = timezoneFromAddress({ state });
  return formatTimeInTimeZone(slot, timeZone);
}

export function MapMarkerInfoCard({
  restaurant,
  onClose,
  onOpen,
  onSelectSlot,
}: MapMarkerInfoCardProps) {
  const photos = restaurant.photos?.filter(Boolean) ?? [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const activePhoto = photos[photoIndex] ?? photos[0];
  const slots = restaurant.availableSlotTimes?.slice(0, 3) ?? [];

  const locationLabel = restaurant.address?.city ?? 'Nearby';
  const rating = restaurant.averageRating ?? 0;
  const reviewCount = restaurant.reviewCount ?? 0;

  const showPrev = photos.length > 1 && photoIndex > 0;
  const showNext = photos.length > 1 && photoIndex < photos.length - 1;

  return (
    <div
      className="rt-map-info-card"
      onClick={(e) => e.stopPropagation()}
      style={{ fontFamily: typography.fontFamily }}
    >
      <div className="rt-map-info-card__media">
        {activePhoto ? (
          canUseNextImage(activePhoto) ? (
            <Image
              src={activePhoto}
              alt={restaurant.name}
              fill
              sizes="320px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activePhoto} alt={restaurant.name} className="rt-map-info-card__img" />
          )
        ) : (
          <div className="rt-map-info-card__placeholder">No photo yet</div>
        )}

        {photos.length > 1 && <div className="rt-map-info-card__shade" aria-hidden />}

        <button
          type="button"
          aria-label="Close"
          className="rt-map-info-card__icon-btn rt-map-info-card__close"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>

        {showPrev && (
          <button
            type="button"
            aria-label="Previous photo"
            className="rt-map-info-card__icon-btn rt-map-info-card__nav rt-map-info-card__nav--prev"
            onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
          >
            <LeftOutlined />
          </button>
        )}
        {showNext && (
          <button
            type="button"
            aria-label="Next photo"
            className="rt-map-info-card__icon-btn rt-map-info-card__nav rt-map-info-card__nav--next"
            onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
          >
            <RightOutlined />
          </button>
        )}

        {photos.length > 1 && (
          <div className="rt-map-info-card__dots" aria-hidden>
            {photos.map((_, i) => (
              <span
                key={i}
                className={
                  i === photoIndex
                    ? 'rt-map-info-card__dot rt-map-info-card__dot--active'
                    : 'rt-map-info-card__dot'
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="rt-map-info-card__body">
        <button
          type="button"
          className="rt-map-info-card__title"
          aria-label={`View ${restaurant.name}`}
          title={restaurant.name}
          onClick={onOpen}
        >
          {restaurant.name}
        </button>

        <div className="rt-map-info-card__meta">
          {reviewCount > 0 && (
            <>
              <StarFilled className="rt-map-info-card__star" />
              <span className="rt-map-info-card__rating">{rating.toFixed(1)}</span>
              <span>({reviewCount.toLocaleString('en-US')})</span>
              <span className="rt-map-info-card__sep">·</span>
            </>
          )}
          <span>{priceRangeLabel(restaurant.priceRange ?? 2)}</span>
          <span className="rt-map-info-card__sep">·</span>
          <span>{restaurant.cuisine}</span>
        </div>

        <div className="rt-map-info-card__location">
          <EnvironmentOutlined className="rt-map-info-card__location-icon" />
          <span>
            {locationLabel}
            {restaurant.address?.state ? `, ${restaurant.address.state}` : ''}
          </span>
        </div>

        {slots.length > 0 ? (
          <div className="rt-map-info-card__slots">
            {slots.map((slot: string) => (
              <button
                key={slot}
                type="button"
                className="rt-map-info-card__slot"
                onClick={() => onSelectSlot(slot)}
              >
                {formatSlotTime(slot, restaurant.address?.state)}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="rt-map-info-card__cta" onClick={onOpen}>
            Check availability
          </button>
        )}
      </div>
    </div>
  );
}
