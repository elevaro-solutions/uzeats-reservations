'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button, Card, Col, Row, Tooltip, Typography } from 'antd';
import { ArrowRightOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons';
import { colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePinnedNav } from '@/lib/usePinnedNav';

const { Text } = Typography;

export type HubLink = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Optional tag next to the title (e.g. Experimental). */
  badge?: ReactNode;
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
  const pathname = usePathname();
  const { user } = useAuth();
  const audience = pathname.startsWith('/admin') ? 'admin' : 'partner';
  const { isPinned, togglePinned } = usePinnedNav(user?.id, audience);
  const restaurant = searchParams.get('restaurant');

  if (links.length === 0) return null;

  return (
    <Row gutter={[16, 16]}>
      {links.map((tool) => {
        const href =
          restaurant && !tool.href.includes('restaurant=')
            ? `${tool.href}${tool.href.includes('?') ? '&' : '?'}restaurant=${encodeURIComponent(restaurant)}`
            : tool.href;
        const pinned = isPinned(tool.href);
        return (
          <Col key={tool.href} {...colProps}>
            <div className="rt-settings-link-wrap" style={{ position: 'relative', height: '100%' }}>
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
                    borderColor: pinned ? colors.brand[200] : colors.border,
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
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 0,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text strong style={{ fontSize: 14 }}>
                            {tool.title}
                          </Text>
                          {tool.badge}
                        </div>
                        <ArrowRightOutlined
                          className="rt-settings-link-arrow"
                          style={{
                            fontSize: 12,
                            color: colors.textTertiary,
                            transition: 'color 0.2s ease, transform 0.2s ease',
                            flexShrink: 0,
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
              <Tooltip title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}>
                <Button
                  type="text"
                  size="small"
                  className="rt-settings-link-pin"
                  aria-label={pinned ? `Unpin ${tool.title} from sidebar` : `Pin ${tool.title} to sidebar`}
                  aria-pressed={pinned}
                  icon={
                    pinned ? (
                      <PushpinFilled style={{ color: colors.brand[600] }} />
                    ) : (
                      <PushpinOutlined />
                    )
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePinned(tool.href);
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    color: pinned ? colors.brand[600] : colors.textTertiary,
                  }}
                />
              </Tooltip>
            </div>
          </Col>
        );
      })}
    </Row>
  );
}
