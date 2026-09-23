'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_PENDING_REQUEST_COUNTS,
  ADMIN_RESTAURANT_SLUG_REQUESTS,
  ADMIN_STATS,
  REVIEW_RESTAURANT_SLUG_REQUEST,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  denied: 'red',
};

type SlugRequestRow = {
  id: string;
  restaurantId: string;
  currentSlug: string;
  requestedSlug: string;
  reason?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  restaurant?: { id: string; name: string; slug: string } | null;
  requestedBy?: { firstName: string; lastName: string; email?: string | null } | null;
  reviewer?: { firstName: string; lastName: string } | null;
};

function SlugRequestsPageContent() {
  const { ready } = useRequireAdmin();
  const { searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyTarget, setDenyTarget] = useState<SlugRequestRow | null>(null);
  const [denyForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_RESTAURANT_SLUG_REQUESTS, {
    skip: !ready,
    variables: {
      status: status || undefined,
      search: searchQuery || undefined,
      limit,
      offset,
    },
  });

  const { data: countData } = useQuery(ADMIN_PENDING_REQUEST_COUNTS, { skip: !ready });
  const pendingCount = countData?.adminPendingRequestCounts?.slugRequests ?? 0;

  const [reviewRequest] = useMutation(REVIEW_RESTAURANT_SLUG_REQUEST, {
    refetchQueries: [ADMIN_PENDING_REQUEST_COUNTS, ADMIN_RESTAURANT_SLUG_REQUESTS, ADMIN_STATS],
  });

  if (!ready) return null;

  const items = (data?.adminRestaurantSlugRequests?.items ?? []) as SlugRequestRow[];
  const total = data?.adminRestaurantSlugRequests?.total ?? 0;

  const columns = [
    {
      title: 'Restaurant',
      render: (_: unknown, r: SlugRequestRow) => (
        <Link href={`/admin/restaurants/${r.restaurantId}`}>
          {r.restaurant?.name || r.restaurantId}
        </Link>
      ),
    },
    {
      title: 'Current',
      dataIndex: 'currentSlug',
      render: (v: string) => <Text code>{v || '—'}</Text>,
    },
    {
      title: 'Requested',
      dataIndex: 'requestedSlug',
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: 'Owner',
      render: (_: unknown, r: SlugRequestRow) =>
        r.requestedBy
          ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}`
          : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('en-US'),
    },
    {
      title: '',
      width: 56,
      render: (_: unknown, r: SlugRequestRow) =>
        r.status === 'pending' ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'approve',
                  label: 'Approve',
                  onClick: async () => {
                    await reviewRequest({
                      variables: { id: r.id, status: 'approved' },
                    });
                    message.success('Slug updated');
                    refetch();
                  },
                },
                {
                  key: 'deny',
                  danger: true,
                  label: 'Deny',
                  onClick: () => {
                    setDenyTarget(r);
                    denyForm.resetFields();
                    setDenyOpen(true);
                  },
                },
              ] as MenuProps['items'],
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} aria-label="Request actions" />
          </Dropdown>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="URL slug requests"
        subtitle="Review owner requests to change a restaurant's public booking URL."
        extra={
          pendingCount > 0 ? (
            <Badge count={pendingCount} overflowCount={99}>
              <Tag color="gold">Pending review</Tag>
            </Badge>
          ) : (
            <Tag>No pending requests</Tag>
          )
        }
      />

      <Card style={{ marginBottom: spacing.md }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search slug or reason"
            defaultValue={searchQuery}
            onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
            onBlur={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Status"
            value={status || undefined}
            onChange={(v) => setStatus(v ?? '')}
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            ...tablePagination,
            total,
          }}
          expandable={{
            expandedRowRender: (r: SlugRequestRow) => (
              <div>
                {r.reason && (
                  <p>
                    <strong>Reason:</strong> {r.reason}
                  </p>
                )}
                {r.notes && (
                  <p>
                    <strong>Admin notes:</strong> {r.notes}
                  </p>
                )}
                {r.reviewer && (
                  <p>
                    <strong>Reviewed by:</strong> {r.reviewer.firstName} {r.reviewer.lastName}
                  </p>
                )}
              </div>
            ),
            rowExpandable: (r: SlugRequestRow) => Boolean(r.reason || r.notes || r.reviewer),
          }}
        />
      </Card>

      <Modal
        title="Deny URL change"
        open={denyOpen}
        onCancel={() => {
          setDenyOpen(false);
          setDenyTarget(null);
        }}
        okText="Deny"
        okButtonProps={{ danger: true }}
        onOk={async () => {
          if (!denyTarget) return;
          const values = await denyForm.validateFields();
          await reviewRequest({
            variables: {
              id: denyTarget.id,
              status: 'denied',
              notes: values.notes?.trim() || undefined,
            },
          });
          message.success('Request denied');
          setDenyOpen(false);
          setDenyTarget(null);
          refetch();
        }}
      >
        <Form form={denyForm} layout="vertical">
          <Form.Item name="notes" label="Note to the owner">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Optional reason" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function AdminSlugRequestsPage() {
  return (
    <Suspense>
      <SlugRequestsPageContent />
    </Suspense>
  );
}
