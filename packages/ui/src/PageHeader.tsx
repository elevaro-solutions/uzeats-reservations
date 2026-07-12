'use client';

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { typography } from './tokens';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Actions rendered on the right (buttons, filters). */
  extra?: ReactNode;
}

/** Consistent page-level heading with optional subtitle and actions. */
export function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}
    >
      <div>
        <Title
          level={3}
          style={{ margin: 0, letterSpacing: typography.letterSpacing.tight }}
        >
          {title}
        </Title>
        {subtitle && (
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </div>
      {extra && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{extra}</div>}
    </div>
  );
}
