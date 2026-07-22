'use client';

import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { colors, typography } from './tokens';

const { Text } = Typography;

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** Optional trend or helper text below the value. */
  hint?: ReactNode;
  hintTone?: 'positive' | 'negative' | 'neutral';
}

/** Compact metric card for dashboard overviews. */
export function StatCard({ label, value, icon, hint, hintTone = 'neutral' }: StatCardProps) {
  const hintColor =
    hintTone === 'positive'
      ? colors.success
      : hintTone === 'negative'
        ? colors.error
        : colors.textTertiary;

  return (
    <div component="StatCard" style={{ display: 'contents' }}><Card styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Text
            type="secondary"
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {label}
          </Text>
          <div
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              letterSpacing: typography.letterSpacing.tight,
              color: colors.textPrimary,
              marginTop: 6,
              lineHeight: typography.lineHeight.tight,
            }}
          >
            {value}
          </div>
          {hint && (
            <div style={{ marginTop: 6, fontSize: typography.fontSize.sm, color: hintColor }}>
              {hint}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: colors.brand[50],
              color: colors.brand[600],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card></div>
  );
}
