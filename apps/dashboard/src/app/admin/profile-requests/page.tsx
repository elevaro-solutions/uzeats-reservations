'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Badge,
  Button,
  Card,
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
import { SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { PageHeader, spacing } from '@reservations/ui';
import {
  ADMIN_PENDING_REQUEST_COUNTS,
  ADMIN_RESTAURANT_PROFILE_CHANGE_REQUESTS,
  ADMIN_STATS,
  REVIEW_RESTAURANT_PROFILE_CHANGE_REQUEST,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text, Paragraph } = Typography;

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

type ProfileSnapshot = {
  description?: string | null;
  neighborhood?: string | null;
  categoryIds?: string[];
  landmarkIds?: string[];
  diningStyles?: string[];
  discoveryOccasions?: string[];
  meals?: string[];
  dietaryTags?: string[];
  amenities?: string[];
  wheelchairAccessible?: boolean;
  faq?: Array<{ question: string; answer: string }>;
  featuredIn?: Array<{
    title: string;
    description?: string | null;
    url?: string | null;
    logoUrl?: string | null;
  }>;
  termsAndConditions?: string | null;
  photos?: string[];
  logoUrl?: string | null;
};

type ProfileRequestRow = {
  id: string;
  restaurantId: string;
  reason?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  current: ProfileSnapshot;
  proposed: ProfileSnapshot;
  restaurant?: { id: string; name: string; slug: string } | null;
  requestedBy?: { firstName: string; lastName: string; email?: string | null } | null;
  reviewer?: { firstName: string; lastName: string } | null;
};

const FIELD_LABELS: Array<{ key: keyof ProfileSnapshot; label: string }> = [
  { key: 'description', label: 'About' },
  { key: 'neighborhood', label: 'Neighborhood' },
  { key: 'categoryIds', label: 'Categories' },
  { key: 'landmarkIds', label: 'Landmarks' },
  { key: 'diningStyles', label: 'Dining styles' },
  { key: 'discoveryOccasions', label: 'Occasions' },
  { key: 'meals', label: 'Meals' },
  { key: 'dietaryTags', label: 'Dietary tags' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'wheelchairAccessible', label: 'Wheelchair accessible' },
  { key: 'faq', label: 'FAQ' },
  { key: 'featuredIn', label: 'Featured in' },
  { key: 'termsAndConditions', label: 'Terms' },
  { key: 'photos', label: 'Photos' },
  { key: 'logoUrl', label: 'Logo' },
];

function formatValue(key: keyof ProfileSnapshot, value: ProfileSnapshot[keyof ProfileSnapshot]) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'photos' && Array.isArray(value)) return `${value.length} photo${value.length === 1 ? '' : 's'}`;
  if (key === 'logoUrl') return String(value);
  if (key === 'faq' && Array.isArray(value)) {
    return value
      .map((item) => `${(item as { question: string }).question}: ${(item as { answer: string }).answer}`)
      .join(' · ') || '—';
  }
  if (key === 'featuredIn' && Array.isArray(value)) {
    return (value as Array<{ title: string }>).map((item) => item.title).join(', ') || '—';
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

function changedFields(row: ProfileRequestRow) {
  return FIELD_LABELS.filter(({ key }) => JSON.stringify(row.current?.[key] ?? null) !== JSON.stringify(row.proposed?.[key] ?? null));
}

function ProfileChangeDiff({ row }: { row: ProfileRequestRow }) {
  const fields = changedFields(row);
  return (
    <div>
      {row.reason && (
        <Paragraph>
          <Text strong>Reason: </Text>
          {row.reason}
        </Paragraph>
      )}
      {row.notes && (
        <Paragraph>
          <Text strong>Admin notes: </Text>
          {row.notes}
        </Paragraph>
      )}
      {row.reviewer && (
        <Paragraph>
          <Text strong>Reviewed by: </Text>
          {row.reviewer.firstName} {row.reviewer.lastName}
        </Paragraph>
      )}
      {fields.length === 0 ? (
        <Text type="secondary">No field-level differences stored.</Text>
      ) : (
        fields.map(({ key, label }) => (
          <Paragraph key={key} style={{ marginBottom: 8 }}>
            <Text strong>{label}: </Text>
            <Text type="secondary">{formatValue(key, row.current?.[key])}</Text>
            {' → '}
            <Text>{formatValue(key, row.proposed?.[key])}</Text>
          </Paragraph>
        ))
      )}
    </div>
  );
}

function ProfileRequestsPageContent() {
  const { ready } = useRequireAdmin();
  const { searchQuery, status, setSearch, setStatus } = useUrlListFilters({
    search: 'q',
    status: 'status',
  });
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyTarget, setDenyTarget] = useState<ProfileRequestRow | null>(null);
  const [denyForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_RESTAURANT_PROFILE_CHANGE_REQUESTS, {
    skip: !ready,
    variables: {
      status: status || undefined,
      search: searchQuery || undefined,
      limit,
      offset,
    },
  });

  const { data: countData } = useQuery(ADMIN_PENDING_REQUEST_COUNTS, { skip: !ready });
  const pendingCount = countData?.adminPendingRequestCounts?.profileChangeRequests ?? 0;

  const [reviewRequest] = useMutation(REVIEW_RESTAURANT_PROFILE_CHANGE_REQUEST, {
    refetchQueries: [
      ADMIN_PENDING_REQUEST_COUNTS,
      ADMIN_RESTAURANT_PROFILE_CHANGE_REQUESTS,
      ADMIN_STATS,
    ],
  });

  if (!ready) return null;

  const items = (data?.adminRestaurantProfileChangeRequests?.items ?? []) as ProfileRequestRow[];
  const total = data?.adminRestaurantProfileChangeRequests?.total ?? 0;

  const columns = [
    {
      title: 'Restaurant',
      render: (_: unknown, r: ProfileRequestRow) => (
        <Link href={`/admin/restaurants/${r.restaurantId}`}>{r.restaurant?.name || r.restaurantId}</Link>
      ),
    },
    {
      title: 'Changes',
      render: (_: unknown, r: ProfileRequestRow) => {
        const fields = changedFields(r);
        return fields.length ? fields.map((f) => f.label).join(', ') : '—';
      },
    },
    {
      title: 'Owner',
      render: (_: unknown, r: ProfileRequestRow) =>
        r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—',
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
      title: 'Actions',
      render: (_: unknown, r: ProfileRequestRow) =>
        r.status === 'pending' ? (
          <Space wrap>
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                await reviewRequest({
                  variables: { id: r.id, status: 'approved' },
                });
                message.success('Public profile updated');
                refetch();
              }}
            >
              Approve
            </Button>
            <Button
              size="small"
              danger
              onClick={() => {
                setDenyTarget(r);
                denyForm.resetFields();
                setDenyOpen(true);
              }}
            >
              Deny
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Public profile requests"
        subtitle="Review owner requests to change diner-facing restaurant profile content."
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
            placeholder="Search restaurant or reason"
            defaultValue={searchQuery}
            onPressEnter={(e) => setSearch((e.target as HTMLInputElement).value)}
            onBlur={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
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
            expandedRowRender: (r: ProfileRequestRow) => <ProfileChangeDiff row={r} />,
            defaultExpandAllRows: false,
          }}
        />
      </Card>

      <Modal
        title="Deny profile change"
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

export default function AdminProfileRequestsPage() {
  return (
    <Suspense>
      <ProfileRequestsPageContent />
    </Suspense>
  );
}
