'use client';

import { Suspense } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import { Card, Table, Tag } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { Space } from 'antd';
import { AUDIT_LOGS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

function AdminAuditPageContent() {
  const { ready } = useRequireAdmin();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 25 });

  const { data, loading } = useQuery(AUDIT_LOGS, {
    variables: { limit, offset },
    skip: !ready,
    fetchPolicy: 'network-only',
  });

  if (!ready) return null;

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Audit logs"
        subtitle="Track admin actions across users, restaurants, invoices, and configuration."
      />
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.auditLogs?.items ?? []}
          pagination={tablePagination(data?.auditLogs?.total ?? 0)}
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'createdAt',
              width: 180,
              render: (v: string) => new Date(v).toLocaleString(),
            },
            {
              title: 'Actor',
              dataIndex: 'actor',
              width: 180,
              render: (actor: any) =>
                actor ? `${actor.firstName} ${actor.lastName}` : '—',
            },
            {
              title: 'Action',
              dataIndex: 'action',
              width: 200,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: 'Resource',
              dataIndex: 'resource',
              width: 120,
            },
            {
              title: 'Resource ID',
              dataIndex: 'resourceId',
              width: 220,
              ellipsis: true,
            },
            {
              title: 'Details',
              dataIndex: 'details',
              ellipsis: true,
              render: (v: string | null) => v || '—',
            },
          ]}
        />
      </Card>
    </Space>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={null}>
      <AdminAuditPageContent />
    </Suspense>
  );
}
