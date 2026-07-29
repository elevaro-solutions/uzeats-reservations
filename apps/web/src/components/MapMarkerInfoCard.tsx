'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  CloseOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
  StarFilled,
} from '@ant-design/icons';
import { colors, priceRangeLabel, radii, shadows, typography } from '@reservations/ui';
import { AVAILABILITY } from '@/lib/graphql';
import type { MapRestaurant } from './RestaurantDiscoveryMap';

type MapMarkerInfoCardProps = {
  restaurant: MapRestaurant;
  date: string;
  partySize: number;
  onClose: () => void;
  onOpen: () => void;
  onSelectSlot: (time: string) => void;
};

function formatSlotTime(slot: string): string {
  return new Date(slot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MapMarkerInfoCard({
  restaurant,
  date,
  partySize,
  onClose,
  onOpen,
  onSelectSlot,
}: MapMarkerInfoCardProps) {
  const photos = restaurant.photos?.filter(Boolean) ?? [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const activePhoto = photos[photoIndex] ?? photos[0];

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

  const locationLabel = restaurant.address?.city ?? 'Nearby';
  const rating = restaurant.averageRating ?? 0;
  const reviewCount = restaurant.reviewCount ?? 0;

  const showPrev = photos.length > 1 && photoIndex > 0;
  const showNext = photos.length > 1 && photoIndex < photos.length - 1;

  return (
    <div
      className="rt-map-info-card"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 320,
        background: colors.surface,
        borderRadius: radii.lg,
        overflow: 'hidden',
        boxShadow: shadows.lg,
        border: `1px solid ${colors.border}`,
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ position: 'relative', height: 168, background: colors.neutral[100] }}>
        {activePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activePhoto}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textTertiary,
              fontSize: typography.fontSize.sm,
            }}
          >
            No photo yet
          </div>
        )}

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.95)',
            color: colors.textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.sm,
          }}
        >
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>

        {showPrev && (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
            style={{
              position: 'absolute',
              top: '50%',
              left: 10,
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              color: colors.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.sm,
            }}
          >
            <LeftOutlined />
          </button>
        )}
        {showNext && (
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
            style={{
              position: 'absolute',
              top: '50%',
              right: 10,
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              color: colors.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.sm,
            }}
          >
            <RightOutlined />
          </button>
        )}

        {photos.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {photos.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.bold,
              color: colors.textPrimary,
              lineHeight: 1.3,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {restaurant.name}
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 6px', marginBottom: 6 }}>
          {reviewCount > 0 && (
            <>
              <StarFilled style={{ color: colors.rating, fontSize: 13 }} />
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                {rating.toFixed(1)}
              </span>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                ({reviewCount.toLocaleString()})
              </span>
              <span style={{ color: colors.textTertiary }}>·</span>
            </>
          )}
          <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            {priceRangeLabel(restaurant.priceRange ?? 2)}
          </span>
          <span style={{ color: colors.textTertiary }}>·</span>
          <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            {restaurant.cuisine}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <EnvironmentOutlined style={{ color: colors.textTertiary, fontSize: 12 }} />
          <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            {locationLabel}
            {restaurant.address?.state ? `, ${restaurant.address.state}` : ''}
          </span>
        </div>

        {slots.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {slots.map((slot: string) => (
              <button
                key={slot}
                type="button"
                onClick={() => onSelectSlot(slot)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: colors.brand[600],
                  color: colors.textInverse,
                  borderRadius: radii.sm,
                  padding: '10px 6px',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  fontFamily: 'inherit',
                  lineHeight: 1.2,
                  boxShadow: shadows.brand,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.brand[700];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.brand[600];
                }}
              >
                {formatSlotTime(slot)}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            style={{
              width: '100%',
              border: `1.5px solid ${colors.brand[200]}`,
              cursor: 'pointer',
              background: colors.brand[50],
              color: colors.brand[700],
              borderRadius: radii.sm,
              padding: '10px 14px',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: 'inherit',
            }}
          >
            Check availability
          </button>
        )}
      </div>
    </div>
  );
}
