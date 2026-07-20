'use client';

import { useQuery } from '@/lib/apollo-hooks';
import { Card, Col, Row, Space, Statistic, Table, Tag } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { CHURN_ALERTS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const COLORS: Record<string, string> = {
  past_due: 'red',
  cancelled: 'default',
  trial_ending: 'gold',
};

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function AdminChurnPage() {
  const { ready } = useRequireAdmin();
  const { data, loading } = useQuery(CHURN_ALERTS, { skip: !ready });

  if (!ready) return null;

  const alerts = data?.churnAlerts ?? [];

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Churn alerts"
        subtitle="Past-due subscriptions, recent cancellations, and trials ending within 7 days."
      />
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Past due"
              value={alerts.filter((a: any) => a.alertType === 'past_due').length}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cancelled (30d)"
              value={alerts.filter((a: any) => a.alertType === 'cancelled').length}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Trials ending"
              value={alerts.filter((a: any) => a.alertType === 'trial_ending').length}
            />
          </Card>
        </Col>
      </Row>
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={alerts}
          columns={[
            {
              title: 'Alert',
              dataIndex: 'alertType',
              render: (t: string) => <Tag color={COLORS[t]}>{t}</Tag>,
            },
            {
              title: 'Restaurant',
              dataIndex: 'restaurantName',
              render: (v: string | null) => v || '—',
            },
            { title: 'Plan', dataIndex: 'plan' },
            { title: 'Status', dataIndex: 'status' },
            {
              title: 'MRR',
              dataIndex: 'monthlyPriceCents',
              render: (v: number) => money(v),
            },
            {
              title: 'Trial ends',
              dataIndex: 'trialEndsAt',
              render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
            {
              title: 'Cancelled',
              dataIndex: 'cancelledAt',
              render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
