'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import { Card, Col, Input, Row, Space, Statistic, Table } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { ADMIN_REVENUE_REPORT } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminRevenuePage() {
  const { ready } = useRequireAdmin();
  const [period, setPeriod] = useState(currentPeriod());
  const { data, loading } = useQuery(ADMIN_REVENUE_REPORT, {
    skip: !ready,
    variables: { period },
  });

  if (!ready) return null;

  const r = data?.adminRevenueReport;

  return (
    <div component="AdminRevenuePage" style={{ display: 'contents' }}><Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Revenue"
        subtitle="Platform SaaS metrics — subscription MRR and invoice collections for the selected period."
        extra={
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: 160 }}
          />
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="MRR" value={money(r?.mrrCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="ARR" value={money(r?.arrCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Billed (period)" value={money(r?.billedCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Collected" value={money(r?.paidCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Outstanding" value={money(r?.outstandingCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Cover fees" value={money(r?.coverFeeCents ?? 0)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Active subs" value={r?.activeSubscriptions ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Past due" value={r?.pastDueSubscriptions ?? 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="By plan" loading={loading}>
            <Table
              rowKey="plan"
              pagination={false}
              size="small"
              dataSource={r?.byPlan ?? []}
              columns={[
                { title: 'Plan', dataIndex: 'plan' },
                { title: 'Subs', dataIndex: 'count' },
                {
                  title: 'MRR',
                  dataIndex: 'mrrCents',
                  render: (v: number) => money(v),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Invoices by status" loading={loading}>
            <Table
              rowKey="status"
              pagination={false}
              size="small"
              dataSource={r?.byInvoiceStatus ?? []}
              columns={[
                { title: 'Status', dataIndex: 'status' },
                { title: 'Count', dataIndex: 'count' },
                {
                  title: 'Total',
                  dataIndex: 'totalCents',
                  render: (v: number) => money(v),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space></div>
  );
}
