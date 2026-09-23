'use client';

import Link from 'next/link';
import { useQuery } from '@/lib/apollo-hooks';
import { Badge, Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import {
  CalendarOutlined,
  FileDoneOutlined,
  ShopOutlined,
  TeamOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { ADMIN_STATS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text, Paragraph } = Typography;

function dollars(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

const shortcuts = [
  {
    href: '/admin/diners',
    title: 'Guests',
    desc: 'Create and manage customer accounts',
    icon: <TeamOutlined />,
  },
  {
    href: '/admin/owners',
    title: 'Restaurant accounts',
    desc: 'Owners and managers',
    icon: <ShopOutlined />,
  },
  {
    href: '/admin/users',
    title: 'Admins',
    desc: 'Platform admins and account managers',
    icon: <TeamOutlined />,
  },
  {
    href: '/admin/support',
    title: 'Support tickets',
    desc: 'CRM notes for guest and restaurant cases',
    icon: <ShopOutlined />,
  },
  {
    href: '/admin/restaurants',
    title: 'Restaurants',
    desc: 'Approve, reject, or suspend venues',
    icon: <ShopOutlined />,
  },
  {
    href: '/admin/reservations',
    title: 'Reservations',
    desc: 'All bookings across restaurants',
    icon: <CalendarOutlined />,
  },
  {
    href: '/admin/slug-requests',
    title: 'URL slugs',
    desc: 'Owner requests to change public booking URLs',
    icon: <ShopOutlined />,
    countKey: 'pendingSlugRequests' as const,
  },
  {
    href: '/admin/profile-requests',
    title: 'Public profile',
    desc: 'Owner requests to change diner-facing restaurant pages',
    icon: <ShopOutlined />,
    countKey: 'pendingProfileChangeRequests' as const,
  },
  {
    href: '/admin/moderation',
    title: 'Moderation',
    desc: 'Flagged reviews and messages',
    icon: <ControlOutlined />,
    countKey: 'pendingModerationItems' as const,
  },
  {
    href: '/admin/billing',
    title: 'Billing',
    desc: 'Invoices, revenue, plans, loyalty, and exports',
    icon: <FileDoneOutlined />,
  },
  {
    href: '/admin/platform',
    title: 'Platform',
    desc: 'Configuration, content, templates, and audit',
    icon: <ControlOutlined />,
  },
];

export default function AdminOverviewPage() {
  const { ready } = useRequireAdmin();
  const { data: stats } = useQuery(ADMIN_STATS, { skip: !ready });

  if (!ready) return null;

  const s = stats?.adminStats;

  return (
    <div component="AdminOverviewPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Platform overview"
        subtitle="Support guests and restaurant accounts, and keep billing and platform settings healthy."
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Users" value={s?.users ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Restaurants" value={s?.restaurants ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Pending approvals" value={s?.pendingRestaurants ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin/profile-requests">
            <Card hoverable>
              <Statistic title="Profile requests" value={s?.pendingProfileChangeRequests ?? 0} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin/slug-requests">
            <Card hoverable>
              <Statistic title="URL slug requests" value={s?.pendingSlugRequests ?? 0} />
            </Card>
          </Link>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Open invoices" value={s?.openInvoices ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Active subscriptions" value={s?.activeSubscriptions ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="MRR" value={dollars(s?.mrrCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Link href="/admin/reservations">
            <Card hoverable>
              <Statistic title="Reservations" value={s?.reservations ?? 0} />
            </Card>
          </Link>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {shortcuts.map((item) => (
          <Col xs={24} sm={12} lg={8} key={item.href}>
            <Card
              hoverable
              style={{ borderRadius: radii.lg, height: '100%' }}
              styles={{ body: { padding: spacing.lg } }}
            >
              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Text style={{ fontSize: 20, color: colors.brand[600] }}>{item.icon}</Text>
                <Text strong style={{ fontSize: 16 }}>
                  {item.title}
                  {'countKey' in item && item.countKey && s?.[item.countKey] ? (
                    <>
                      {' '}
                      <Badge count={s[item.countKey]} size="small" overflowCount={99} />
                    </>
                  ) : null}
                </Text>
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {item.desc}
                </Paragraph>
                <Link href={item.href}>
                  <Button type="link" style={{ paddingInline: 0 }}>
                    Open
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space></div>
  );
}
