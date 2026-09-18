'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Checkbox,
  Image,
  Input,
  List,
  Modal,
  Rate,
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
import {
  ADD_RESTAURANT_PHOTOS,
  GENERATE_REVIEW_REPLY_DRAFT,
  REPLY_TO_REVIEW,
  RESTAURANT_REVIEWS,
  SET_REVIEW_HIDDEN,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text, Paragraph } = Typography;

export function AdminRestaurantReviewsPanel({
  restaurantId,
  photos = [],
  onPhotosSaved,
}: {
  restaurantId: string;
  photos?: string[];
  onPhotosSaved?: () => void;
}) {
  const [replying, setReplying] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedByReview, setSelectedByReview] = useState<Record<string, string[]>>({});
  const { page, pageSize, limit, offset, setPagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data, loading, refetch } = useQuery(RESTAURANT_REVIEWS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
  });
  const [replyToReview, { loading: savingReply }] = useMutation(REPLY_TO_REVIEW);
  const [generateDraft, { loading: generatingDraft }] = useMutation(GENERATE_REVIEW_REPLY_DRAFT);
  const [addRestaurantPhotos, { loading: addingPhotos }] = useMutation(ADD_RESTAURANT_PHOTOS);
  const [setReviewHidden] = useMutation(SET_REVIEW_HIDDEN);

  const galleryPhotos = photos;

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
        `Gallery is full (max ${RESTAURANT_MAX_PHOTOS}). Remove photos in Manage first.`,
      );
      return;
    }

    try {
      await addRestaurantPhotos({
        variables: {
          restaurantId,
          urls: toAdd.slice(0, remaining),
        },
      });
      const added = Math.min(toAdd.length, remaining);
      message.success(
        added === 1 ? 'Added to gallery' : `Added ${added} photos to gallery`,
      );
      if (toAdd.length > remaining) {
        message.warning(`Gallery only had room for ${remaining} more photo(s)`);
      }
      onPhotosSaved?.();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to add to gallery');
    }
  };

  return (
    <div component="AdminRestaurantReviewsPanel">
      <Card title="Reviews">
        <List
          loading={loading}
          dataSource={data?.restaurantReviews?.items ?? []}
          locale={{ emptyText: 'No reviews yet' }}
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
                  </Button>,
                  <Button
                    key="hide"
                    size="small"
                    icon={r.hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={() => void toggleHidden(r)}
                  >
                    {r.hidden ? 'Unhide' : 'Hide'}
                  </Button>,
                ]}
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
                                        onClick={() => void addPhotosToGallery([url])}
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
                              onClick={() => void addPhotosToGallery(selected)}
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
        onOk={() => void handleReply()}
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
              onClick={() => void handleGenerateDraft()}
            >
              Auto-generate response
            </Button>
            <Input.TextArea
              rows={6}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank the guest, address their feedback…"
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
