'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Image,
  Input,
  List,
  Modal,
  Rate,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FlagOutlined,
  MessageOutlined,
  MoreOutlined,
  PictureOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  RESTAURANT_MAX_PHOTOS,
  REVIEW_REPORT_DETAILS_MAX,
  REVIEW_REPORT_REASONS,
  REVIEW_REPORT_REASON_HELP,
  REVIEW_REPORT_REASON_LABELS,
  browserMediaUrl,
  type ReviewReportReason,
} from '@reservations/shared';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  ADD_RESTAURANT_PHOTOS,
  GENERATE_REVIEW_REPLY_DRAFT,
  MY_RESTAURANTS,
  REPORT_REVIEW,
  RESTAURANT_REVIEWS,
  REPLY_TO_REVIEW,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title, Text, Paragraph } = Typography;

const REPORT_REASON_OPTIONS = REVIEW_REPORT_REASONS.map((value) => ({
  value,
  label: REVIEW_REPORT_REASON_LABELS[value],
}));

function ReviewsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [replying, setReplying] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [reporting, setReporting] = useState<any>(null);
  const [reportReason, setReportReason] = useState<ReviewReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [selectedByReview, setSelectedByReview] = useState<Record<string, string[]>>({});
  const { page, pageSize, limit, offset, setPagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data: restData, refetch: refetchRestaurants } = useQuery(MY_RESTAURANTS, {
    skip: !user,
  });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);
  const activeRestaurant = useMemo(
    () => restaurants.find((r: any) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );
  const galleryPhotos: string[] = activeRestaurant?.photos ?? [];

  const { data, loading, refetch } = useQuery(RESTAURANT_REVIEWS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId, limit, offset },
  });
  const [replyToReview, { loading: savingReply }] = useMutation(REPLY_TO_REVIEW);
  const [generateDraft, { loading: generatingDraft }] = useMutation(
    GENERATE_REVIEW_REPLY_DRAFT,
  );
  const [addRestaurantPhotos, { loading: addingPhotos }] = useMutation(ADD_RESTAURANT_PHOTOS);
  const [reportReview, { loading: reportingReview }] = useMutation(REPORT_REVIEW);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setSelectedByReview({});
  }, [activeRestaurantId]);

  const canReply =
    user?.role === 'restaurant_owner' ||
    user?.role === 'manager' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin';

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await replyToReview({ variables: { reviewId: replying.id, reply: replyText.trim() } });
      message.success('Reply posted');
      setReplying(null);
      setReplyText('');
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to post reply');
    }
  };

  const handleGenerateDraft = async () => {
    if (!replying?.id) return;
    try {
      const result = await generateDraft({ variables: { reviewId: replying.id } });
      const draft = result.data?.generateReviewReplyDraft;
      if (!draft?.trim()) {
        message.error('Could not generate a draft');
        return;
      }
      setReplyText(draft);
      message.success('Draft ready — edit before posting');
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to generate draft');
    }
  };

  const openReport = (review: any) => {
    setReporting(review);
    setReportReason(
      review.flagReasonCode &&
        (REVIEW_REPORT_REASONS as readonly string[]).includes(review.flagReasonCode)
        ? (review.flagReasonCode as ReviewReportReason)
        : null,
    );
    setReportDetails(review.flagDetails ?? '');
  };

  const handleReport = async () => {
    if (!reporting?.id || !reportReason) return;
    const details = reportDetails.trim();
    if (reportReason === 'other' && details.length < 10) {
      message.error('Please explain the policy issue (at least 10 characters)');
      return;
    }
    try {
      await reportReview({
        variables: {
          reviewId: reporting.id,
          reason: reportReason,
          details: details || null,
        },
      });
      message.success(
        reporting.flagged
          ? 'Report updated — still in the moderation queue'
          : 'Reported for moderation. The review stays public until Tablevera reviews it.',
      );
      setReporting(null);
      setReportReason(null);
      setReportDetails('');
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to report review');
    }
  };

  const togglePhotoSelected = (reviewId: string, url: string, checked: boolean) => {
    setSelectedByReview((prev) => {
      const current = prev[reviewId] ?? [];
      const next = checked
        ? [...new Set([...current, url])]
        : current.filter((u) => u !== url);
      return { ...prev, [reviewId]: next };
    });
  };

  const addPhotosToGallery = async (urls: string[]) => {
    if (!activeRestaurantId) return;
    const unique = [...new Set(urls.filter(Boolean))];
    if (unique.length === 0) return;

    const alreadyInGallery = unique.filter((url) => galleryPhotos.includes(url));
    const toAdd = unique.filter((url) => !galleryPhotos.includes(url));

    if (toAdd.length === 0) {
      message.info(
        alreadyInGallery.length === 1
          ? 'That photo is already in the gallery'
          : 'Those photos are already in the gallery',
      );
      return;
    }

    const remaining = RESTAURANT_MAX_PHOTOS - galleryPhotos.length;
    if (remaining <= 0) {
      message.error(
        `Gallery is full (max ${RESTAURANT_MAX_PHOTOS}). Remove photos in Settings first.`,
      );
      return;
    }

    try {
      await addRestaurantPhotos({
        variables: {
          restaurantId: activeRestaurantId,
          urls: toAdd.slice(0, remaining),
        },
      });
      const added = Math.min(toAdd.length, remaining);
      message.success(
        added === 1
          ? 'Added to gallery — reorder in Settings if you want it in the hero'
          : `Added ${added} photos to gallery — reorder in Settings if you want them in the hero`,
      );
      if (toAdd.length > remaining) {
        message.warning(`Gallery only had room for ${remaining} more photo(s)`);
      }
      await refetchRestaurants();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to add to gallery');
    }
  };

  return (
    <div component="ReviewsPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Reviews
          </Title>
          <Text type="secondary">
            Reply publicly, generate a draft, report policy violations for moderation, or add diner
            photos to the gallery. You cannot hide a review only because you disagree with it.
          </Text>
        </div>
        <Select style={{ width: 260 }} {...restaurantSelectProps} />

        <Card>
          <List
            loading={loading}
            dataSource={data?.restaurantReviews?.items ?? []}
            pagination={{
              current: page,
              pageSize,
              total: data?.restaurantReviews?.total ?? 0,
              onChange: (p) => setPagination(p),
            }}
            renderItem={(r: any) => {
              const selected = selectedByReview[r.id] ?? [];
              const reviewPhotos: string[] = r.photos ?? [];
              return (
                <List.Item
                  actions={
                    canReply
                      ? [
                          <Dropdown
                            key="more"
                            menu={{
                              items: [
                                {
                                  key: 'reply',
                                  icon: <MessageOutlined />,
                                  label: r.ownerReply ? 'Edit reply' : 'Reply',
                                  onClick: () => {
                                    setReplying(r);
                                    setReplyText(r.ownerReply ?? '');
                                  },
                                },
                                {
                                  key: 'report',
                                  icon: <FlagOutlined />,
                                  label: r.flagged ? 'Update report' : 'Report',
                                  onClick: () => openReport(r),
                                },
                              ] as MenuProps['items'],
                            }}
                            trigger={['click']}
                          >
                            <Button
                              size="small"
                              icon={<MoreOutlined />}
                              aria-label="Review actions"
                            />
                          </Dropdown>,
                        ]
                      : undefined
                  }
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                        <Text strong>
                          {r.diner ? `${r.diner.firstName} ${r.diner.lastName}` : 'Guest'}
                        </Text>
                        <Text type="secondary">
                          {new Date(r.createdAt).toLocaleDateString('en-US')}
                        </Text>
                        {r.hidden && <Tag color="orange">Hidden</Tag>}
                        {r.flagged && <Tag color="red">Reported</Tag>}
                      </Space>
                    }
                    description={
                      <>
                        {(r.foodRating != null ||
                          r.serviceRating != null ||
                          r.atmosphereRating != null) && (
                          <Space size={12} style={{ marginBottom: 4 }}>
                            {r.foodRating != null && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Food {r.foodRating}/5
                              </Text>
                            )}
                            {r.serviceRating != null && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Service {r.serviceRating}/5
                              </Text>
                            )}
                            {r.atmosphereRating != null && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Atmosphere {r.atmosphereRating}/5
                              </Text>
                            )}
                          </Space>
                        )}
                        <Paragraph style={{ marginBottom: 4 }}>
                          {r.comment || <em>No comment</em>}
                        </Paragraph>
                        {r.flagged && r.flagReason && (
                          <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                            Report: {r.flagReason}
                          </Paragraph>
                        )}
                        {reviewPhotos.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginBottom: 8,
                              }}
                            >
                              <Image.PreviewGroup>
                                {reviewPhotos.map((url: string) => {
                                  const inGallery = galleryPhotos.includes(url);
                                  const isSelected = selected.includes(url);
                                  return (
                                    <div key={url} style={{ textAlign: 'center' }}>
                                      <Image
                                        src={browserMediaUrl(url)}
                                        alt="Review photo"
                                        width={72}
                                        height={72}
                                        style={{ objectFit: 'cover', borderRadius: 6 }}
                                      />
                                      <div style={{ marginTop: 4 }}>
                                        <Checkbox
                                          checked={isSelected}
                                          disabled={inGallery}
                                          onChange={(e) =>
                                            togglePhotoSelected(r.id, url, e.target.checked)
                                          }
                                        >
                                          <Text type="secondary" style={{ fontSize: 12 }}>
                                            {inGallery ? 'In gallery' : 'Select'}
                                          </Text>
                                        </Checkbox>
                                      </div>
                                      {!inGallery && (
                                        <Button
                                          type="link"
                                          size="small"
                                          icon={<PictureOutlined />}
                                          loading={addingPhotos}
                                          onClick={() => addPhotosToGallery([url])}
                                          style={{ padding: 0, height: 'auto' }}
                                        >
                                          Add to gallery
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </Image.PreviewGroup>
                            </div>
                            {selected.length > 0 && (
                              <Button
                                size="small"
                                icon={<PictureOutlined />}
                                loading={addingPhotos}
                                onClick={() => addPhotosToGallery(selected)}
                              >
                                Add selected to gallery ({selected.length})
                              </Button>
                            )}
                          </div>
                        )}
                        {r.ownerReply && (
                          <div
                            style={{
                              background: colors.brand[50],
                              borderLeft: `3px solid ${colors.brand[600]}`,
                              padding: '8px 12px',
                              borderRadius: 4,
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Restaurant reply ·{' '}
                              {new Date(r.ownerRepliedAt).toLocaleDateString('en-US')}
                            </Text>
                            <div>{r.ownerReply}</div>
                          </div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>

        <Modal
          title="Reply to review"
          open={!!replying}
          onCancel={() => setReplying(null)}
          onOk={handleReply}
          confirmLoading={savingReply}
          okText="Post reply"
          okButtonProps={{ disabled: !replyText.trim() }}
        >
          {replying && (
            <Space orientation="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Space>
                  <Rate disabled value={replying.rating} style={{ fontSize: 14 }} />
                  <Text type="secondary">
                    {replying.diner
                      ? `${replying.diner.firstName} ${replying.diner.lastName}`
                      : 'Guest'}
                  </Text>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {replying.comment || <em>No comment</em>}
                </Paragraph>
              </div>
              <Button
                icon={<ThunderboltOutlined />}
                loading={generatingDraft}
                onClick={handleGenerateDraft}
              >
                Auto-generate response
              </Button>
              <Input.TextArea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank the guest, address their feedback…"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Generate a personalized draft, edit it, then post. Guests are notified when you
                post.
              </Text>
            </Space>
          )}
        </Modal>

        <Modal
          title="Report review for moderation"
          open={!!reporting}
          onCancel={() => {
            setReporting(null);
            setReportReason(null);
            setReportDetails('');
          }}
          onOk={handleReport}
          confirmLoading={reportingReview}
          okText={reporting?.flagged ? 'Update report' : 'Submit report'}
          okButtonProps={{
            disabled:
              !reportReason ||
              (reportReason === 'other' && reportDetails.trim().length < 10),
          }}
        >
          {reporting && (
            <Space orientation="vertical" style={{ width: '100%' }} size={12}>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Report only policy issues (spam, fake, hate, private info, etc.). The review stays
                public until Tablevera decides. Disagreeing with a rating is not a valid reason —
                reply publicly instead.
              </Paragraph>
              <div>
                <Space>
                  <Rate disabled value={reporting.rating} style={{ fontSize: 14 }} />
                  <Text type="secondary">
                    {reporting.diner
                      ? `${reporting.diner.firstName} ${reporting.diner.lastName}`
                      : 'Guest'}
                  </Text>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {reporting.comment || <em>No comment</em>}
                </Paragraph>
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Reason
                </Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select a policy reason"
                  options={REPORT_REASON_OPTIONS}
                  value={reportReason ?? undefined}
                  onChange={(v) => setReportReason(v)}
                />
                {reportReason && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                    {REVIEW_REPORT_REASON_HELP[reportReason]}
                  </Text>
                )}
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Details {reportReason === 'other' ? '(required)' : '(optional)'}
                </Text>
                <Input.TextArea
                  rows={4}
                  value={reportDetails}
                  maxLength={REVIEW_REPORT_DETAILS_MAX}
                  showCount
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Facts that support the report (what happened, why it violates policy)…"
                />
              </div>
            </Space>
          )}
        </Modal>
      </Space>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <div component="ReviewsPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <ReviewsPageContent />
      </Suspense>
    </div>
  );
}
