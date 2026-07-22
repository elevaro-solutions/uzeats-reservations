'use client';

import Link from 'next/link';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import {
  FileDoneOutlined,
  FundOutlined,
  ShopOutlined,
  TeamOutlined,
  ControlOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { ADMIN_STATS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text, Paragraph } = Typography;

function dollars(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

const shortcuts = [
  {
    href: '/admin/users',
    title: 'Users & access',
    desc: 'Roles, invites, impersonation, password resets',
    icon: <TeamOutlined />,
  },
  {
    href: '/admin/support',
    title: 'Support tickets',
    desc: 'CRM notes for diner and restaurant cases',
    icon: <ShopOutlined />,
  },
  {
    href: '/admin/restaurants',
    title: 'Restaurants',
    desc: 'Approve, reject, or suspend venues',
    icon: <ShopOutlined />,
  },
  {
    href: '/admin/invoices',
    title: 'Invoices',
    desc: 'Pending, upcoming, Stripe sync',
    icon: <FileDoneOutlined />,
  },
  {
    href: '/admin/churn',
    title: 'Churn alerts',
    desc: 'Past due, cancelled, trials ending',
    icon: <FundOutlined />,
  },
  {
    href: '/admin/moderation',
    title: 'Moderation',
    desc: 'Flagged reviews and messages',
    icon: <ControlOutlined />,
  },
  {
    href: '/admin/revenue',
    title: 'Revenue',
    desc: 'MRR, cover fees, and plan mix',
    icon: <FundOutlined />,
  },
  {
    href: '/admin/loyalty',
    title: 'Loyalty program',
    desc: 'Points liability, tiers, and referrals',
    icon: <TagOutlined />,
  },
  {
    href: '/admin/pricing',
    title: 'Plans & pricing',
    desc: 'Edit packages and cover fees',
    icon: <TagOutlined />,
  },
  {
    href: '/admin/config',
    title: 'Configuration',
    desc: 'Roles, kill switches, support contacts',
    icon: <ControlOutlined />,
  },
  {
    href: '/admin/templates',
    title: 'Email templates',
    desc: 'Password reset, booking, invites',
    icon: <TagOutlined />,
  },
  {
    href: '/admin/exports',
    title: 'CSV exports',
    desc: 'Users, invoices, revenue downloads',
    icon: <FileDoneOutlined />,
  },
  {
    href: '/admin/sla',
    title: 'SLA metrics',
    desc: 'Approvals and support response times',
    icon: <FundOutlined />,
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
        subtitle="Support diners and restaurant owners, and keep billing and platform settings healthy."
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
          <Card>
            <Statistic title="Reservations" value={s?.reservations ?? 0} />
          </Card>
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
