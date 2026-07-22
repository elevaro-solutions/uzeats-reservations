'use client';

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { colors, radii, typography } from './tokens';

const { Text } = Typography;

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Call-to-action, e.g. a Button. */
  action?: ReactNode;
}

/** Friendly empty state for lists and searches with no results. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div component="EmptyState"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '56px 24px',
        background: colors.surface,
        border: `1px dashed ${colors.border}`,
        borderRadius: radii.lg,
      }}
    >
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: colors.brand[50],
            color: colors.brand[600],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 16,
          }}
        >
          {icon}
        </div>
      )}
      <Text strong style={{ fontSize: typography.fontSize.md }}>
        {title}
      </Text>
      {description && (
        <Text type="secondary" style={{ marginTop: 6, maxWidth: 400 }}>
          {description}
        </Text>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
