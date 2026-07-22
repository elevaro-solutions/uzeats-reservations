'use client';

import { useQuery } from '@/lib/apollo-hooks';
import { Card, Col, Row, Space, Statistic } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { SLA_METRICS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

export default function AdminSlaPage() {
  const { ready } = useRequireAdmin();
  const { data, loading } = useQuery(SLA_METRICS, { skip: !ready });

  if (!ready) return null;
  const m = data?.slaMetrics;

  return (
    <div component="AdminSlaPage" style={{ display: 'contents' }}><Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="SLA metrics"
        subtitle="Approval latency, support response times, and open risk queues."
      />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic title="Pending restaurant approvals" value={m?.pendingRestaurantApprovals ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic
              title="Oldest pending (hours)"
              value={m?.oldestPendingApprovalHours ?? 0}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic
              title="Avg approval time 30d (hours)"
              value={m?.avgApprovalHoursLast30d ?? 0}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic title="Open support tickets" value={m?.openSupportTickets ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic
              title="Avg first response 30d (hours)"
              value={m?.avgFirstResponseHoursLast30d ?? 0}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic
              title="Avg resolution 30d (hours)"
              value={m?.avgResolutionHoursLast30d ?? 0}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic title="Flagged reviews" value={m?.flaggedReviews ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic title="Flagged messages" value={m?.flaggedMessages ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card loading={loading}>
            <Statistic
              title="Overdue / pending invoices"
              value={m?.overdueOrPendingInvoices ?? 0}
            />
          </Card>
        </Col>
      </Row>
    </Space></div>
  );
}
