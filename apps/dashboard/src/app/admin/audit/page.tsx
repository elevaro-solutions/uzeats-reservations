'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Card, Table, Typography, Tag } from 'antd';
import { useAuth } from '@/lib/auth';
import { AUDIT_LOGS } from '@/lib/graphql';

const { Title } = Typography;

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery(AUDIT_LOGS, {
    variables: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    skip: user?.role !== 'admin',
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/');
  }, [authLoading, user, router]);

  const logs = data?.auditLogs ?? [];

  return (
    <>
      <Title level={2}>Audit Logs</Title>
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={logs}
          pagination={{
            pageSize: PAGE_SIZE,
            current: page,
            onChange: setPage,
            showSizeChanger: false,
          }}
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
    </>
  );
}
