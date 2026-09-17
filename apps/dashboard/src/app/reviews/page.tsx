'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Checkbox,
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
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  MessageOutlined,
  PictureOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { RESTAURANT_MAX_PHOTOS } from '@reservations/shared';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  ADD_RESTAURANT_PHOTOS,
  GENERATE_REVIEW_REPLY_DRAFT,
  MY_RESTAURANTS,
  RESTAURANT_REVIEWS,
  REPLY_TO_REVIEW,
  SET_REVIEW_HIDDEN,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title, Text, Paragraph } = Typography;

function ReviewsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [replying, setReplying] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
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
  const [setReviewHidden] = useMutation(SET_REVIEW_HIDDEN);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setSelectedByReview({});
  }, [activeRestaurantId]);

  const canReply =
    user?.role === 'restaurant_owner' ||
    user?.role === 'staff' ||
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

  const toggleHidden = async (review: any) => {
    await setReviewHidden({ variables: { reviewId: review.id, hidden: !review.hidden } });
    message.success(review.hidden ? 'Review unhidden' : 'Review hidden from public listing');
    refetch();
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
            Owners and managers can reply to guests, generate a draft response, and add diner
            photos to the restaurant gallery.
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
                  actions={[
                    canReply && (
                      <Button
                        key="reply"
                        size="small"
                        icon={<MessageOutlined />}
                        onClick={() => {
                          setReplying(r);
                          setReplyText(r.ownerReply ?? '');
                        }}
                      >
                        {r.ownerReply ? 'Edit reply' : 'Reply'}
                      </Button>
                    ),
                    <Button
                      key="hide"
                      size="small"
                      icon={r.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      onClick={() => toggleHidden(r)}
                    >
                      {r.hidden ? 'Unhide' : 'Hide'}
                    </Button>,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                        <Text strong>
                          {r.diner ? `${r.diner.firstName} ${r.diner.lastName}` : 'Guest'}
                        </Text>
                        <Text type="secondary">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </Text>
                        {r.hidden && <Tag color="orange">Hidden</Tag>}
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
                                        src={url}
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
                              {new Date(r.ownerRepliedAt).toLocaleDateString()}
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
