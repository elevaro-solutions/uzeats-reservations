'use client';

import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, Space, Table, Tabs, Tag, message } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import {
  FLAGGED_CONTENT,
  SET_MESSAGE_HIDDEN,
  SET_REVIEW_HIDDEN_ADMIN,
  UNFLAG_MESSAGE,
  UNFLAG_REVIEW,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

export default function AdminModerationPage() {
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
      dataIndex: 'flagReason',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Actions',
      render: (_: unknown, r: any) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              await unflagReview({ variables: { id: r.id } });
              message.success('Unflagged');
              refetch();
            }}
          >
            Unflag
          </Button>
          <Button
            size="small"
            danger={!r.hidden}
            onClick={async () => {
              await hideReview({ variables: { id: r.id, hidden: !r.hidden } });
              message.success(r.hidden ? 'Shown' : 'Hidden');
              refetch();
            }}
          >
            {r.hidden ? 'Show' : 'Hide'}
          </Button>
        </Space>
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
      title: 'Actions',
      render: (_: unknown, r: any) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              await unflagMessage({ variables: { id: r.id } });
              message.success('Unflagged');
              refetch();
            }}
          >
            Unflag
          </Button>
          <Button
            size="small"
            danger={!r.hidden}
            onClick={async () => {
              await hideMessage({ variables: { id: r.id, hidden: !r.hidden } });
              message.success(r.hidden ? 'Shown' : 'Hidden');
              refetch();
            }}
          >
            {r.hidden ? 'Show' : 'Hide'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Content moderation"
        subtitle="Review flagged reviews and messages. Hide content or clear flags."
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
                />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
