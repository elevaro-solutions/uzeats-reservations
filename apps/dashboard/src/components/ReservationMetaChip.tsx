'use client';

import { Tooltip } from 'antd';
import { colors, radii, typography } from '@reservations/ui';

/** Compact meta tile used on reservation detail (guests, source, UTMs, paths). */
export function ReservationMetaChip({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  /** Full text on hover when value is truncated or shortened. */
  title?: string;
}) {
  const chip = (
    <div
      style={{
        flex: '1 1 140px',
        minWidth: 128,
        maxWidth: '100%',
        padding: '14px 16px',
        background: colors.surface,
        borderRadius: radii.md,
        border: `1px solid ${colors.bordersubtle}`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: typography.letterSpacing.wide,
          textTransform: 'uppercase',
          color: colors.textTertiary,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.snug,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        {value}
      </div>
    </div>
  );

  if (title && title !== value) {
    return (
      <Tooltip title={<span style={{ wordBreak: 'break-all' }}>{title}</span>}>
        {chip}
      </Tooltip>
    );
  }

  return chip;
}
