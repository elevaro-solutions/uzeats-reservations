'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Dropdown, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { EyeOutlined, MoreOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import {
  REVIEW_REPORT_REASON_LABELS,
  type ReviewReportReason,
} from '@reservations/shared';
import {
  FLAGGED_CONTENT,
  SET_MESSAGE_HIDDEN,
  SET_REVIEW_HIDDEN_ADMIN,
  UNFLAG_MESSAGE,
  UNFLAG_REVIEW,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text } = Typography;

type FlaggedRow = {
  id: string;
  type: string;
  restaurantId: string;
  restaurantName: string | null;
  authorName: string | null;
  body: string;
  hidden: boolean;
  flagReason?: string | null;
  flagReasonCode?: string | null;
  flagDetails?: string | null;
};

function reasonLabel(code: string | null | undefined, fallback: string | null | undefined) {
  if (code && code in REVIEW_REPORT_REASON_LABELS) {
    return REVIEW_REPORT_REASON_LABELS[code as ReviewReportReason];
  }
  return fallback || '—';
}

function detailHref(row: FlaggedRow) {
  return `/admin/moderation/${row.id}?type=${encodeURIComponent(row.type)}`;
}

export default function AdminModerationPage() {
  const router = useRouter();
  const { ready } = useRequireAdmin();
  const { data, loading, refetch } = useQuery(FLAGGED_CONTENT, {
    skip: !ready,
    variables: { limit: 100 },
  });
  const [unflagReview] = useMutation(UNFLAG_REVIEW);
  const [hideReview] = useMutation(SET_REVIEW_HIDDEN_ADMIN);
  const [unflagMessage] = useMutation(UNFLAG_MESSAGE);
  const [hideMessage] = useMutation(SET_MESSAGE_HIDDEN);

  if (!ready) return null;

  const reviewMenu = (r: FlaggedRow): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View details',
        onClick: () => router.push(detailHref(r)),
      },
      { type: 'divider' },
      {
        key: 'dismiss',
        label: 'Dismiss',
        onClick: async () => {
          await unflagReview({ variables: { id: r.id } });
          message.success('Dismissed — review stays public');
          refetch();
        },
      },
      {
        key: 'toggle-hide',
        danger: !r.hidden,
        label: r.hidden ? 'Show' : 'Hide',
        onClick: async () => {
          await hideReview({ variables: { id: r.id, hidden: !r.hidden } });
          message.success(r.hidden ? 'Shown again' : 'Hidden from public listing');
          refetch();
        },
      },
    ];
    if (!r.hidden) {
      items.push({
        key: 'hide-clear',
        danger: true,
        label: 'Hide & clear',
        onClick: async () => {
          await hideReview({ variables: { id: r.id, hidden: true } });
          await unflagReview({ variables: { id: r.id } });
          message.success('Hidden and cleared from queue');
          refetch();
        },
      });
    }
    return items;
  };

  const messageMenu = (r: FlaggedRow): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View details',
      onClick: () => router.push(detailHref(r)),
    },
    { type: 'divider' },
    {
      key: 'unflag',
      label: 'Unflag',
      onClick: async () => {
        await unflagMessage({ variables: { id: r.id } });
        message.success('Unflagged');
        refetch();
      },
    },
    {
      key: 'toggle-hide',
      danger: !r.hidden,
      label: r.hidden ? 'Show' : 'Hide',
      onClick: async () => {
        await hideMessage({ variables: { id: r.id, hidden: !r.hidden } });
        message.success(r.hidden ? 'Shown' : 'Hidden');
        refetch();
      },
    },
  ];

  const reviewCols = [
    {
      title: 'Restaurant',
      dataIndex: 'restaurantName',
      render: (v: string | null) => v || '—',
    },
    { title: 'Author', dataIndex: 'authorName', render: (v: string | null) => v || '—' },
    { title: 'Body', dataIndex: 'body', ellipsis: true },
    {
      title: 'Hidden',
      dataIndex: 'hidden',
      render: (v: boolean) => (v ? <Tag>hidden</Tag> : <Tag color="green">visible</Tag>),
    },
    {
      title: 'Reason',
      key: 'reason',
      width: 220,
      render: (_: unknown, r: FlaggedRow) => (
        <div>
          <div>{reasonLabel(r.flagReasonCode, r.flagReason)}</div>
          {r.flagDetails ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.flagDetails}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: '',
      width: 56,
      render: (_: unknown, r: FlaggedRow) => (
        <Dropdown menu={{ items: reviewMenu(r) }} trigger={['click']}>
          <Button
            size="small"
            icon={<MoreOutlined />}
            aria-label="Moderation actions"
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const messageCols = [
    {
      title: 'Restaurant',
      dataIndex: 'restaurantName',
      render: (v: string | null) => v || '—',
    },
    { title: 'Author', dataIndex: 'authorName', render: (v: string | null) => v || '—' },
    { title: 'Body', dataIndex: 'body', ellipsis: true },
    {
      title: 'Hidden',
      dataIndex: 'hidden',
      render: (v: boolean) => (v ? <Tag>hidden</Tag> : <Tag color="green">visible</Tag>),
    },
    {
      title: '',
      width: 56,
      render: (_: unknown, r: FlaggedRow) => (
        <Dropdown menu={{ items: messageMenu(r) }} trigger={['click']}>
          <Button
            size="small"
            icon={<MoreOutlined />}
            aria-label="Moderation actions"
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <div component="AdminModerationPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Content moderation"
          subtitle="Owner/manager review reports and flagged messages. Dismiss keeps the review public; Hide removes it from diner listings."
        />
        <Card>
          <Tabs
            items={[
              {
                key: 'reviews',
                label: `Reviews (${data?.flaggedContent?.reviews?.length ?? 0})`,
                children: (
                  <Table
                    loading={loading}
                    rowKey="id"
                    dataSource={data?.flaggedContent?.reviews ?? []}
                    columns={reviewCols}
                    onRow={(record: FlaggedRow) => ({
                      onClick: () => router.push(detailHref(record)),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'messages',
                label: `Messages (${data?.flaggedContent?.messages?.length ?? 0})`,
                children: (
                  <Table
                    loading={loading}
                    rowKey="id"
                    dataSource={data?.flaggedContent?.messages ?? []}
                    columns={messageCols}
                    onRow={(record: FlaggedRow) => ({
                      onClick: () => router.push(detailHref(record)),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}
