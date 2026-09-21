'use client';

import Link from 'next/link';
import { Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd';
import {
  AppstoreOutlined,
  EditOutlined,
  TableOutlined,
  TagOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import {
  StatCard,
  formatPhoneDisplay,
  priceRangeLabel,
  spacing,
  typography,
} from '@reservations/ui';
import type { AdminRestaurantRecord } from '@/components/AdminManageRestaurant';
import { accountDetailPath } from '@/lib/adminAccounts';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Paragraph, Text } = Typography;

export type OverviewTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
};

export type OverviewRestaurant = AdminRestaurantRecord & {
  tables?: Array<{ id: string; active?: boolean }>;
  shifts?: Array<{ id: string; active?: boolean }>;
  menu?: {
    sections?: Array<{ items?: unknown[] }>;
  } | null;
};

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function statusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}

function compactUrl(href: string) {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${host}${path}`;
  } catch {
    return href;
  }
}

function ExternalLink({ href }: { href: string }) {
  return (
    <Typography.Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      ellipsis
      style={{ maxWidth: '100%', display: 'inline-block' }}
    >
      {compactUrl(href)}
    </Typography.Link>
  );
}

function Flag({
  label,
  value,
  on,
}: {
  label: string;
  value: string;
  on: boolean;
}) {
  return (
    <div>
      <Text
        type="secondary"
        style={{
          display: 'block',
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wide,
        }}
      >
        {label}
      </Text>
      <Tag
        color={on ? 'green' : 'default'}
        style={{ marginTop: 8, marginInlineEnd: 0 }}
      >
        {value}
      </Tag>
    </div>
  );
}

export function AdminRestaurantOverviewPanel({
  restaurant,
  owner,
  teamCount,
  onGoToTab,
}: {
  restaurant: OverviewRestaurant;
  owner?: OverviewTeamMember | null;
  teamCount: number;
  onGoToTab: (tab: string) => void;
}) {
  const sections = restaurant.menu?.sections ?? [];
  const menuItemCount = sections.reduce((n, section) => n + (section.items?.length ?? 0), 0);
  const tables = restaurant.tables ?? [];
  const activeTables = tables.filter((table) => table.active !== false).length;
  const shifts = restaurant.shifts ?? [];
  const activeShifts = shifts.filter((shift) => shift.active !== false).length;

  const plan = restaurant.subscription?.plan
    ? String(restaurant.subscription.plan).toUpperCase()
    : 'None';
  const subStatus = restaurant.subscription?.status;
  const subHintParts = [
    subStatus ? statusLabel(subStatus) : 'No active subscription',
    restaurant.subscription?.monthlyPriceCents != null
      ? `${money(restaurant.subscription.monthlyPriceCents)}/mo`
      : null,
  ].filter(Boolean);
  const subTone: 'positive' | 'negative' | 'neutral' =
    subStatus === 'active' || subStatus === 'trialing'
      ? 'positive'
      : subStatus === 'past_due' || subStatus === 'canceled' || subStatus === 'cancelled'
        ? 'negative'
        : 'neutral';

  const addressLine = restaurant.address
    ? [
        restaurant.address.line1,
        restaurant.address.line2,
        [restaurant.address.city, restaurant.address.state, restaurant.address.zip]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const publicUrl = restaurant.slug
    ? buildRestaurantBookingUrl(getPublicWebUrl(), {
        slug: restaurant.slug,
        id: restaurant.id,
      })
    : null;

  const phoneDisplay = restaurant.phone ? formatPhoneDisplay(restaurant.phone) || restaurant.phone : null;
  const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : null;
  const ownerPhone = owner?.phone ? formatPhoneDisplay(owner.phone) || owner.phone : null;

  const depositValue = restaurant.depositRequired
    ? money(restaurant.depositAmountCents)
    : 'Not required';
  const loyaltyValue = restaurant.loyaltyEnabled
    ? `${restaurant.loyaltyPointsPerVisit ?? 0} pts / visit`
    : 'Off';

  return (
    <div component="AdminRestaurantOverviewPanel" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
            <StatCard
              label="Package"
              value={plan}
              hint={subHintParts.join(' · ')}
              hintTone={subTone}
              icon={<TagOutlined />}
              onClick={() => onGoToTab('package')}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
            <StatCard
              label="Menu"
              value={`${menuItemCount} item${menuItemCount === 1 ? '' : 's'}`}
              hint={`${sections.length} section${sections.length === 1 ? '' : 's'}`}
              hintTone={menuItemCount === 0 ? 'negative' : 'neutral'}
              icon={<AppstoreOutlined />}
              onClick={() => onGoToTab('menu')}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
            <StatCard
              label="Floor"
              value={`${tables.length} table${tables.length === 1 ? '' : 's'}`}
              hint={`${activeTables} active · ${activeShifts} shift${activeShifts === 1 ? '' : 's'}`}
              hintTone={tables.length === 0 ? 'negative' : 'neutral'}
              icon={<TableOutlined />}
              onClick={() => onGoToTab('tables')}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
            <StatCard
              label="Team"
              value={`${teamCount} member${teamCount === 1 ? '' : 's'}`}
              hint={ownerName ? `Owner: ${ownerName}` : 'No owner on the team'}
              hintTone={!owner ? 'negative' : 'neutral'}
              icon={<TeamOutlined />}
              onClick={() => onGoToTab('team')}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Card
              title="About"
              extra={
                <Button type="primary" icon={<EditOutlined />} onClick={() => onGoToTab('manage')}>
                  Edit details
                </Button>
              }
            >
              {restaurant.description ? (
                <Paragraph style={{ marginTop: 0, marginBottom: spacing.md }}>
                  {restaurant.description}
                </Paragraph>
              ) : (
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: spacing.md }}>
                  No description yet.
                </Paragraph>
              )}
              <Descriptions column={{ xs: 1, sm: 3 }} size="small">
                <Descriptions.Item label="Cuisine">{restaurant.cuisine || '—'}</Descriptions.Item>
                <Descriptions.Item label="Price">
                  {priceRangeLabel(restaurant.priceRange || 1)}
                </Descriptions.Item>
                <Descriptions.Item label="Featured">
                  <Tag color={restaurant.featured ? 'gold' : 'default'}>
                    {restaurant.featured ? 'Yes' : 'No'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Public URL" span={3}>
                  {publicUrl && restaurant.slug ? (
                    <ExternalLink href={publicUrl} />
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card title="Contact & location">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Phone">
                  {phoneDisplay ? (
                    <Typography.Text copyable={{ text: restaurant.phone ?? phoneDisplay }}>
                      {phoneDisplay}
                    </Typography.Text>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Address">{addressLine || '—'}</Descriptions.Item>
                <Descriptions.Item label="Website">
                  {restaurant.website ? <ExternalLink href={restaurant.website} /> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Menu URL">
                  {restaurant.menuUrl ? <ExternalLink href={restaurant.menuUrl} /> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Owner">
                  {owner ? (
                    <Space orientation="vertical" size={0}>
                      <Link href={accountDetailPath(owner.role, owner.id)}>
                        {ownerName || 'Owner'}
                      </Link>
                      {owner.email ? (
                        <Text type="secondary" copyable={{ text: owner.email }}>
                          {owner.email}
                        </Text>
                      ) : null}
                      {ownerPhone ? <Text type="secondary">{ownerPhone}</Text> : null}
                    </Space>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Card
          title="Booking setup"
          extra={
            <Button type="link" style={{ paddingInline: 0 }} onClick={() => onGoToTab('manage')}>
              Edit
            </Button>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Flag label="Deposit" value={depositValue} on={Boolean(restaurant.depositRequired)} />
            </Col>
            <Col xs={12} md={6}>
              <Flag label="Loyalty" value={loyaltyValue} on={Boolean(restaurant.loyaltyEnabled)} />
            </Col>
            <Col xs={12} md={6}>
              <Flag
                label="POS"
                value={restaurant.posEnabled ? 'Enabled' : 'Disabled'}
                on={Boolean(restaurant.posEnabled)}
              />
            </Col>
            <Col xs={12} md={6}>
              <Flag
                label="Smart assign"
                value={restaurant.useSmartAssign ? 'On' : 'Off'}
                on={Boolean(restaurant.useSmartAssign)}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
}
