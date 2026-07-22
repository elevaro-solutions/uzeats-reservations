'use client';

import { colors, radii, typography } from './tokens';

type StatusStyle = { color: string; background: string };

const STYLES: Record<string, StatusStyle> = {
  pending: { color: colors.warning, background: colors.warningBg },
  confirmed: { color: colors.info, background: colors.infoBg },
  seated: { color: '#0e7490', background: '#e6f7fa' },
  completed: { color: colors.success, background: colors.successBg },
  cancelled: { color: colors.textSecondary, background: colors.neutral[100] },
  no_show: { color: colors.error, background: colors.errorBg },
  approved: { color: colors.success, background: colors.successBg },
  rejected: { color: colors.error, background: colors.errorBg },
  suspended: { color: colors.warning, background: colors.warningBg },
  waiting: { color: colors.warning, background: colors.warningBg },
  notified: { color: colors.info, background: colors.infoBg },
  booked: { color: colors.success, background: colors.successBg },
  expired: { color: colors.textSecondary, background: colors.neutral[100] },
};

const FALLBACK: StatusStyle = { color: colors.textSecondary, background: colors.neutral[100] };

export function StatusTag({ status }: { status: string }) {
  const style = STYLES[status] ?? FALLBACK;
  const label = status.replace(/_/g, ' ');

  return (
    <span component="StatusTag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: style.color,
        background: style.background,
        borderRadius: radii.pill,
        padding: '2px 10px',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        lineHeight: 1.8,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
