'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, Col, Row, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { colors, radii, spacing } from '@reservations/ui';

const { Text } = Typography;

export type HubLink = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

type HubLinkCardsProps = {
  links: HubLink[];
  /** Ant Col span breakpoints; defaults match Settings setup tools. */
  colProps?: { xs?: number; sm?: number; lg?: number };
};

export function HubLinkCards({
  links,
  colProps = { xs: 24, sm: 12, lg: 8 },
}: HubLinkCardsProps) {
  const searchParams = useSearchParams();
  const restaurant = searchParams.get('restaurant');

  if (links.length === 0) return null;

  return (
    <Row gutter={[16, 16]}>
      {links.map((tool) => {
        const href =
          restaurant && !tool.href.includes('restaurant=')
            ? `${tool.href}${tool.href.includes('?') ? '&' : '?'}restaurant=${encodeURIComponent(restaurant)}`
            : tool.href;
        return (
        <Col key={tool.href} {...colProps}>
          <Link href={href} style={{ display: 'block', height: '100%' }}>
            <Card
              className="rt-settings-link"
              size="small"
              styles={{
                body: {
                  padding: spacing.md,
                  height: '100%',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                },
              }}
              style={{
                height: '100%',
                borderRadius: radii.lg,
                borderColor: colors.border,
              }}
              hoverable={false}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.sm,
                    background: colors.brand[50],
                    color: colors.brand[600],
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {tool.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text strong style={{ fontSize: 14 }}>
                      {tool.title}
                    </Text>
                    <ArrowRightOutlined
                      className="rt-settings-link-arrow"
                      style={{
                        fontSize: 12,
                        color: colors.textTertiary,
                        transition: 'color 0.2s ease, transform 0.2s ease',
                      }}
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                    {tool.description}
                  </Text>
                </div>
              </div>
            </Card>
          </Link>
        </Col>
        );
      })}
    </Row>
  );
}
