'use client';

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { typography } from './tokens';

const { Title, Text } = Typography;

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Navigation back to the parent list; rendered above the title. */
  back?: ReactNode;
  /** Actions rendered on the right (buttons, filters). */
  extra?: ReactNode;
}

/** Consistent page-level heading with optional subtitle and actions. */
export function PageHeader({ title, subtitle, extra, back }: PageHeaderProps) {
  return (
    <div component="PageHeader" style={{ marginBottom: 24 }}>
      {back ? <div style={{ marginBottom: 8 }}>{back}</div> : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
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
    </div>
  );
}
