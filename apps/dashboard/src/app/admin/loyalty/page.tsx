'use client';

import { useQuery } from '@/lib/apollo-hooks';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { PageHeader, colors, radii } from '@reservations/ui';
import { ADMIN_LOYALTY_STATS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text } = Typography;

export default function AdminLoyaltyPage() {
  const ready = useRequireAdmin();
  const { data, loading } = useQuery(ADMIN_LOYALTY_STATS, { skip: !ready });
  const stats = data?.adminLoyaltyStats;
  const leaders = data?.adminReferralLeaders ?? [];

  return (
    <div component="AdminLoyaltyPage">
      <PageHeader
        title="Loyalty program"
        subtitle="Platform-wide points liability, tiers, and referral activity"
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic
              title="Outstanding points"
              value={stats?.totalOutstandingPoints ?? 0}
              prefix={<TrophyOutlined style={{ color: colors.brand[600] }} />}
            />
            <Text type="secondary">Total unredeemed balance across diners</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Users with points" value={stats?.usersWithPoints ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Referrals" value={stats?.referralsCount ?? 0} />
            <Text type="secondary">Accounts created with a referral code</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Earned (30d)" value={stats?.pointsEarned30d ?? 0} suffix="pts" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }}>
            <Statistic title="Redeemed (30d)" value={stats?.pointsRedeemed30d ?? 0} suffix="pts" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loading} style={{ borderRadius: radii.lg }} title="Tier distribution">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text>Bronze: <strong>{stats?.tierBronze ?? 0}</strong></Text>
              <Text>Silver: <strong>{stats?.tierSilver ?? 0}</strong></Text>
              <Text>Gold: <strong>{stats?.tierGold ?? 0}</strong></Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="Top referrers"
        style={{ marginTop: 16, borderRadius: radii.lg }}
        loading={loading}
      >
        <Table
          rowKey="userId"
          pagination={false}
          dataSource={leaders}
          locale={{ emptyText: 'No referral activity yet' }}
          columns={[
            {
              title: 'User',
              key: 'user',
              render: (_: unknown, r: { firstName: string; lastName: string; email?: string | null }) =>
                `${r.firstName} ${r.lastName}`.trim() || r.email || '—',
            },
            {
              title: 'Referral code',
              dataIndex: 'referralCode',
              render: (code: string | null) => code ?? '—',
            },
            {
              title: 'Referees',
              dataIndex: 'refereesCount',
              align: 'right' as const,
            },
          ]}
        />
      </Card>
    </div>
  );
}
