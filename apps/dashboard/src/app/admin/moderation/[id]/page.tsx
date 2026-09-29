'use client';

import { Suspense, useState } from 'react';
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
  DELETE_REVIEW,
  FLAGGED_CONTENT_ITEM,
  RESPOND_TO_REVIEW_REPORT,
  SET_MESSAGE_HIDDEN,
  SET_REVIEW_HIDDEN_ADMIN,
  UNFLAG_MESSAGE,
  UNFLAG_REVIEW,
} from '@/lib/graphql';
import { ReviewReportChat } from '@/components/ReviewReportThread';
import type { SupportAttachmentDraft } from '@/components/SupportAttachmentUpload';
import { useAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/roles';
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
  const { user } = useAuth();
  const canDelete = user ? isSuperAdmin(user.role) : false;

  const { data, loading, refetch } = useQuery(FLAGGED_CONTENT_ITEM, {
    skip: !ready || !id,
    variables: { id, type },
    fetchPolicy: 'cache-and-network',
  });
  const [responseBody, setResponseBody] = useState('');
  const [responseAttachments, setResponseAttachments] = useState<SupportAttachmentDraft[]>([]);
  const [unflagReview] = useMutation(UNFLAG_REVIEW);
  const [respondToReport, { loading: sendingResponse }] = useMutation(RESPOND_TO_REVIEW_REPORT);
  const [hideReview] = useMutation(SET_REVIEW_HIDDEN_ADMIN);
  const [deleteReview] = useMutation(DELETE_REVIEW);
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

  const sendReportResponse = async () => {
    if (!item) return;
    if (!responseBody.trim() && responseAttachments.length === 0) {
      message.error('Write a response or attach an image');
      return;
    }
    try {
      await respondToReport({
        variables: {
          reviewId: item.id,
          body: responseBody.trim(),
          attachments: responseAttachments.map((file) => ({
            url: file.url,
            key: file.key,
            filename: file.filename,
            contentType: file.contentType,
            size: file.size,
          })),
        },
      });
      message.success('Response sent to the reporter');
      setResponseBody('');
      setResponseAttachments([]);
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to send response');
    }
  };

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
              ...(canDelete
                ? [
                    { type: 'divider' as const },
                    {
                      key: 'delete',
                      danger: true,
                      label: 'Delete permanently',
                      onClick: async () => {
                        await deleteReview({ variables: { reviewId: item.id } });
                        message.success('Review deleted');
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

              {isReview && item ? (
                <ReviewReportChat
                  title="Report chat"
                  mineIsReporter={false}
                  opening={{
                    flaggedByName: item.flaggedByName,
                    flagReason: reasonLabel(item.flagReasonCode, item.flagReason),
                    flagDetails: item.flagDetails,
                    flaggedAt: item.flaggedAt,
                  }}
                  responses={item.reportResponses}
                  composer={
                    item.flaggedByName && item.flagged
                      ? {
                          body: responseBody,
                          attachments: responseAttachments,
                          onBodyChange: setResponseBody,
                          onAttachmentsChange: setResponseAttachments,
                          onSend: () => void sendReportResponse(),
                          sending: sendingResponse,
                          placeholder: `Message ${item.flaggedByName}…`,
                          hint: `Chat with ${item.flaggedByName} about this report — not the guest who wrote the review. Enter to send.`,
                        }
                      : null
                  }
                  closedNotice={
                    item.flaggedByName && !item.flagged
                      ? 'Report dismissed — chat is closed. History stays visible to you and the reporter.'
                      : !item.flaggedByName
                        ? 'This report has no reporter, so a response can’t be delivered.'
                        : null
                  }
                />
              ) : null}
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
