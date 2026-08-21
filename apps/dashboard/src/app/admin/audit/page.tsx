'use client';

import { Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Select, Space, Table, Tag, message } from 'antd';
import { CopyOutlined, EyeOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { AUDIT_LOG_FILTER_OPTIONS, AUDIT_LOGS } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { auditCopyText } from './auditCopy';

function AdminAuditPageContent() {
  const router = useRouter();
  const { ready } = useRequireAdmin();
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 25,
  });
  const { actor, action, resource, setActor, setAction, setResource } = useUrlListFilters({
    actor: 'actor',
    action: 'action',
    resource: 'resource',
  });

  const { data: filterData } = useQuery(AUDIT_LOG_FILTER_OPTIONS, {
    skip: !ready,
    fetchPolicy: 'cache-first',
  });

  const { data, loading } = useQuery(AUDIT_LOGS, {
    variables: {
      actorId: actor || undefined,
      action: action || undefined,
      resource: resource || undefined,
      limit,
      offset,
    },
    skip: !ready,
    fetchPolicy: 'network-only',
  });

  const actorOptions = useMemo(
    () =>
      (filterData?.auditLogFilterOptions?.actors ?? []).map(
        (u: { id: string; firstName: string; lastName: string; email?: string }) => ({
          value: u.id,
          label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
        }),
      ),
    [filterData],
  );

  const actionOptions = useMemo(
    () =>
      (filterData?.auditLogFilterOptions?.actions ?? []).map((v: string) => ({
        value: v,
        label: v,
      })),
    [filterData],
  );

  const resourceOptions = useMemo(
    () =>
      (filterData?.auditLogFilterOptions?.resources ?? []).map((v: string) => ({
        value: v,
        label: v,
      })),
    [filterData],
  );

  const copyLog = async (log: Parameters<typeof auditCopyText>[0]) => {
    try {
      await navigator.clipboard.writeText(auditCopyText(log));
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy');
    }
  };

  if (!ready) return null;

  return (
    <div component="AdminAuditPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Audit logs"
        subtitle="Track admin actions across users, restaurants, invoices, and configuration."
      />
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Actor"
            style={{ width: 260 }}
            value={actor}
            onChange={(v) => setActor(v)}
            options={actorOptions}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Action"
            style={{ width: 220 }}
            value={action}
            onChange={(v) => setAction(v)}
            options={actionOptions}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Resource"
            style={{ width: 200 }}
            value={resource}
            onChange={(v) => setResource(v)}
            options={resourceOptions}
          />
        </Space>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.auditLogs?.items ?? []}
          pagination={tablePagination(data?.auditLogs?.total ?? 0)}
          onRow={(record) => ({
            onClick: () => router.push(`/admin/audit/${record.id}`),
            style: { cursor: 'pointer' },
          })}
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
              render: (actorRow: any) =>
                actorRow ? `${actorRow.firstName} ${actorRow.lastName}` : '—',
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
            {
              title: '',
              key: 'actions',
              width: 100,
              render: (_: unknown, row: any) => (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    aria-label="View"
                    onClick={() => router.push(`/admin/audit/${row.id}`)}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    aria-label="Copy"
                    onClick={() => copyLog(row)}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space></div>
  );
}

export default function AdminAuditPage() {
  return (
    <div component="AdminAuditPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <AdminAuditPageContent />
    </Suspense></div>
  );
}
