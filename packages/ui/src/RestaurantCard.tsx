'use client';

import { Card, Rate, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { priceRangeLabel } from './theme';
import { colors, radii, shadows, typography } from './tokens';

const { Text } = Typography;

export interface RestaurantCardProps {
  id: string;
  name: string;
  cuisine: string;
  priceRange: number;
  city: string;
  state: string;
  rating?: number;
  reviewCount?: number;
  photoUrl?: string;
  availableSlots?: string[];
  onClick?: (id: string) => void;
  onSelectSlot?: (id: string, time: string) => void;
}

export function RestaurantCard({
  id,
  name,
  cuisine,
  priceRange,
  city,
  state,
  rating = 0,
  reviewCount = 0,
  photoUrl,
  availableSlots = [],
  onClick,
  onSelectSlot,
}: RestaurantCardProps) {
  return (
    <Card
      hoverable
      style={{ overflow: 'hidden', height: '100%' }}
      cover={
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={name}
              src={photoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                background: `linear-gradient(135deg, ${colors.neutral[100]} 0%, ${colors.neutral[200]} 100%)`,
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
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(4px)',
              borderRadius: radii.pill,
              padding: '3px 10px',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
              color: colors.textPrimary,
              boxShadow: shadows.xs,
            }}
          >
            {cuisine}
          </span>
        </div>
      }
      onClick={() => onClick?.(id)}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Text
          strong
          ellipsis
          style={{ fontSize: typography.fontSize.md, letterSpacing: typography.letterSpacing.tight }}
        >
          {name}
        </Text>
        <Text type="secondary" style={{ fontSize: typography.fontSize.sm, whiteSpace: 'nowrap' }}>
          {priceRangeLabel(priceRange)}
        </Text>
      </div>

      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <EnvironmentOutlined style={{ color: colors.textTertiary, fontSize: 12 }} />
        <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
          {city}, {state}
        </Text>
      </div>

      {reviewCount > 0 && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Rate disabled allowHalf value={rating} style={{ fontSize: 13 }} />
          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
            {rating.toFixed(1)} ({reviewCount})
          </Text>
        </div>
      )}

      {availableSlots.length > 0 ? (
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableSlots.slice(0, 4).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectSlot?.(id, slot);
              }}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: colors.brand[600],
                color: colors.textInverse,
                borderRadius: radii.sm,
                padding: '6px 12px',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                fontFamily: 'inherit',
                lineHeight: 1.2,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.brand[700])}
              onMouseLeave={(e) => (e.currentTarget.style.background = colors.brand[600])}
            >
              {new Date(slot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </button>
          ))}
        </div>
      ) : (
        <Text
          type="secondary"
          style={{ display: 'block', marginTop: 14, fontSize: typography.fontSize.sm }}
        >
          No times available today
        </Text>
      )}
    </Card>
  );
}
