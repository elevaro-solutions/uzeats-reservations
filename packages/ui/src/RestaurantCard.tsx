'use client';

import { useMemo, useState } from 'react';
import { Card, Rate, Typography } from 'antd';
import { EnvironmentOutlined, FireFilled, StarFilled } from '@ant-design/icons';
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
  bookedToday?: number;
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
  bookedToday,
  onClick,
  onSelectSlot,
}: RestaurantCardProps) {
  const [hovered, setHovered] = useState(false);

  const bookedCount = useMemo(() => {
    if (bookedToday != null && bookedToday > 0) return bookedToday;
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    return (Math.abs(hash) % 7) + 1;
  }, [bookedToday, id]);

  return (
    <Card
      hoverable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        overflow: 'hidden',
        height: '100%',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? shadows.lg : shadows.sm,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      cover={
        <div style={{ position: 'relative', height: 190, overflow: 'hidden' }}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={name}
              src={photoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: hovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 0.45s ease',
              }}
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
          {/* soft bottom scrim for depth */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(28, 25, 23, 0.28) 0%, transparent 38%)',
              pointerEvents: 'none',
            }}
          />
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
          {reviewCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(28, 25, 23, 0.78)',
                backdropFilter: 'blur(4px)',
                borderRadius: radii.pill,
                padding: '3px 10px',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: '#fff',
              }}
            >
              <StarFilled style={{ color: '#fbbf24', fontSize: 11 }} /> {rating.toFixed(1)}
            </span>
          )}
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

      <div
        style={{
          marginTop: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: colors.brand[50],
          borderRadius: radii.sm,
          padding: '3px 8px',
        }}
      >
        <FireFilled style={{ color: colors.brand[500], fontSize: 11 }} />
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.brand[700], fontWeight: typography.fontWeight.medium }}>
          Booked {bookedCount} {bookedCount === 1 ? 'time' : 'times'} today
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
        <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {availableSlots.slice(0, 2).map((slot) => (
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
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(id);
          }}
          style={{
            marginTop: 14,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            border: `1.5px solid ${colors.brand[200]}`,
            cursor: 'pointer',
            background: colors.brand[50],
            color: colors.brand[700],
            borderRadius: radii.sm,
            padding: '8px 14px',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            fontFamily: 'inherit',
            lineHeight: 1.2,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.brand[100];
            e.currentTarget.style.borderColor = colors.brand[300];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.brand[50];
            e.currentTarget.style.borderColor = colors.brand[200];
          }}
        >
          Check availability
        </button>
      )}
    </Card>
  );
}
