'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Image,
  Rate,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons';
import {
  REVIEW_REPORT_REASON_LABELS,
  browserMediaUrl,
  type ReviewReportReason,
} from '@reservations/shared';
import { PageHeader, colors, spacing } from '@reservations/ui';
import {
  FLAGGED_CONTENT_ITEM,
  SET_MESSAGE_HIDDEN,
  SET_REVIEW_HIDDEN_ADMIN,
  UNFLAG_MESSAGE,
  UNFLAG_REVIEW,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Text, Paragraph } = Typography;

function reasonLabel(code: string | null | undefined, fallback: string | null | undefined) {
  if (code && code in REVIEW_REPORT_REASON_LABELS) {
    return REVIEW_REPORT_REASON_LABELS[code as ReviewReportReason];
  }
  return fallback || '—';
}

function ModerationDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = String(params?.id ?? '');
  const type = searchParams.get('type') === 'message' ? 'message' : 'review';
  const { ready } = useRequireAdmin();

  const { data, loading, refetch } = useQuery(FLAGGED_CONTENT_ITEM, {
    skip: !ready || !id,
    variables: { id, type },
    fetchPolicy: 'cache-and-network',
  });
  const [unflagReview] = useMutation(UNFLAG_REVIEW);
  const [hideReview] = useMutation(SET_REVIEW_HIDDEN_ADMIN);
  const [unflagMessage] = useMutation(UNFLAG_MESSAGE);
  const [hideMessage] = useMutation(SET_MESSAGE_HIDDEN);

  if (!ready) return null;

  const item = data?.flaggedContentItem;

  if (!loading && !item) {
    return (
      <div component="AdminModerationDetailPage" style={{ display: 'contents' }}>
        <Link href="/admin/moderation">
          <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
            Back to moderation
          </Button>
        </Link>
        <Empty description="Item not found" style={{ marginTop: 48 }} />
      </div>
    );
  }

  const isReview = item?.type === 'review';
  const photos: string[] = item?.photos ?? [];

  const afterAction = (redirectToList = false) => {
    if (redirectToList) {
      router.push('/admin/moderation');
      return;
    }
    refetch();
  };

  const moreItems: MenuProps['items'] = item
    ? [
        {
          key: 'restaurant',
          label: 'Open restaurant',
          onClick: () =>
            router.push(
              `/admin/restaurants/${item.restaurantId}?tab=${isReview ? 'reviews' : 'overview'}`,
            ),
        },
        ...(isReview
          ? [
              {
                key: 'dismiss',
                label: 'Dismiss report',
                onClick: async () => {
                  await unflagReview({ variables: { id: item.id } });
                  message.success('Dismissed — review stays public');
                  afterAction(true);
                },
              } as NonNullable<MenuProps['items']>[number],
              {
                key: 'toggle-hide',
                danger: !item.hidden,
                label: item.hidden ? 'Show on listing' : 'Hide from listing',
                onClick: async () => {
                  await hideReview({ variables: { id: item.id, hidden: !item.hidden } });
                  message.success(item.hidden ? 'Shown again' : 'Hidden from public listing');
                  afterAction();
                },
              } as NonNullable<MenuProps['items']>[number],
              ...(!item.hidden
                ? [
                    {
                      key: 'hide-clear',
                      danger: true,
                      label: 'Hide & clear from queue',
                      onClick: async () => {
                        await hideReview({ variables: { id: item.id, hidden: true } });
                        await unflagReview({ variables: { id: item.id } });
                        message.success('Hidden and cleared from queue');
                        afterAction(true);
                      },
                    } as NonNullable<MenuProps['items']>[number],
                  ]
                : []),
            ]
          : [
              {
                key: 'unflag',
                label: 'Unflag',
                onClick: async () => {
                  await unflagMessage({ variables: { id: item.id } });
                  message.success('Unflagged');
                  afterAction(true);
                },
              } as NonNullable<MenuProps['items']>[number],
              {
                key: 'toggle-hide',
                danger: !item.hidden,
                label: item.hidden ? 'Show' : 'Hide',
                onClick: async () => {
                  await hideMessage({ variables: { id: item.id, hidden: !item.hidden } });
                  message.success(item.hidden ? 'Shown' : 'Hidden');
                  afterAction();
                },
              } as NonNullable<MenuProps['items']>[number],
            ]),
      ]
    : [];

  return (
    <div component="AdminModerationDetailPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <div>
          <Link href="/admin/moderation">
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
              Back to moderation
            </Button>
          </Link>
          <PageHeader
            title={isReview ? 'Review report' : 'Flagged message'}
            subtitle={
              item
                ? `${item.restaurantName || 'Restaurant'} · reported ${
                    item.flaggedAt
                      ? new Date(item.flaggedAt).toLocaleString('en-US')
                      : '—'
                  }`
                : undefined
            }
            extra={
              item ? (
                <Dropdown menu={{ items: moreItems }} trigger={['click']}>
                  <Button icon={<MoreOutlined />}>More actions</Button>
                </Dropdown>
              ) : null
            }
          />
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
              <Card title="Content" loading={loading}>
                {item ? (
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                      {isReview && item.rating != null ? (
                        <Rate disabled value={item.rating} style={{ fontSize: 16 }} />
                      ) : null}
                      <Text strong>{item.authorName || 'Unknown author'}</Text>
                      <Text type="secondary">
                        {new Date(item.createdAt).toLocaleString('en-US')}
                      </Text>
                      {item.hidden ? <Tag>hidden</Tag> : <Tag color="green">visible</Tag>}
                      {item.flagged ? <Tag color="red">in queue</Tag> : <Tag>cleared</Tag>}
                    </Space>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                      {item.body || <em>No comment</em>}
                    </Paragraph>
                    {photos.length > 0 ? (
                      <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                          Attachments
                        </Text>
                        <Image.PreviewGroup>
                          <Space wrap>
                            {photos.map((url) => (
                              <Image
                                key={url}
                                src={browserMediaUrl(url)}
                                alt="Review photo"
                                width={96}
                                height={96}
                                style={{ objectFit: 'cover', borderRadius: 6 }}
                              />
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    ) : null}
                    {item.ownerReply ? (
                      <div
                        style={{
                          background: colors.brand[50],
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          Owner reply
                        </Text>
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {item.ownerReply}
                        </Paragraph>
                        {item.ownerRepliedAt ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(item.ownerRepliedAt).toLocaleString('en-US')}
                          </Text>
                        ) : null}
                      </div>
                    ) : isReview ? (
                      <Text type="secondary">No owner reply yet</Text>
                    ) : null}
                  </Space>
                ) : null}
              </Card>
            </Space>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Management" loading={loading}>
              {item ? (
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Restaurant
                    </Text>
                    <div>
                      <Link href={`/admin/restaurants/${item.restaurantId}`}>
                        {item.restaurantName || item.restaurantId}
                      </Link>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Visibility
                    </Text>
                    <div>
                      {item.hidden ? <Tag>hidden</Tag> : <Tag color="green">visible</Tag>}
                      {item.flagged ? <Tag color="red">in queue</Tag> : <Tag>cleared</Tag>}
                    </div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Report reason
                    </Text>
                    <div>{reasonLabel(item.flagReasonCode, item.flagReason)}</div>
                    {item.flagDetails ? (
                      <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
                        {item.flagDetails}
                      </Paragraph>
                    ) : null}
                  </div>
                  {item.flaggedByName ? (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Reported by
                      </Text>
                      <div>{item.flaggedByName}</div>
                    </div>
                  ) : null}
                </Space>
              ) : null}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default function AdminModerationDetailPage() {
  return (
    <div component="AdminModerationDetailPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <ModerationDetailContent />
      </Suspense>
    </div>
  );
}
