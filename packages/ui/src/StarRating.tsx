'use client';

import type { CSSProperties } from 'react';
import { StarFilled } from '@ant-design/icons';
import { colors } from './tokens';

export type StarRatingProps = {
  /** 0–5 rating; half stars supported (e.g. 4.4). */
  value: number;
  /** Star glyph size in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible label; defaults to “Rated X out of 5”. */
  'aria-label'?: string;
};

/**
 * Display-only star row that never depends on Ant Design Rate CSS-in-JS.
 * Ant Design's Rate renders as a list with half-star layers; before cssinjs
 * injects, those list items stack vertically (~10 stars) on slow networks.
 */
export function StarRating({
  value,
  size = 13,
  className,
  style,
  'aria-label': ariaLabel,
}: StarRatingProps) {
  const clamped = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  const label = ariaLabel ?? `Rated ${clamped.toFixed(1)} out of 5`;

  return (
    <span
      className={className}
      role="img"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(2, Math.round(size * 0.15)),
        lineHeight: 1,
        flexShrink: 0,
        height: size,
        ...style,
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, clamped - i));
        return (
          <span
            key={i}
            aria-hidden
            style={{
              position: 'relative',
              display: 'inline-block',
              width: size,
              height: size,
              fontSize: size,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            <StarFilled
              style={{
                color: colors.border,
                position: 'absolute',
                inset: 0,
                fontSize: size,
              }}
            />
            {fill > 0 && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  width: `${fill * 100}%`,
                }}
              >
                <StarFilled
                  style={{
                    color: colors.rating,
                    fontSize: size,
                    display: 'block',
                  }}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
