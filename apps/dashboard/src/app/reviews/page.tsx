'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
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
import { EyeInvisibleOutlined, EyeOutlined, MessageOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
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
  const [restaurantId, setRestaurantId] = useState<string>();
  const [replying, setReplying] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const { page, pageSize, limit, offset, setPagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(RESTAURANT_REVIEWS, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
  });
  const [replyToReview, { loading: savingReply }] = useMutation(REPLY_TO_REVIEW);
  const [setReviewHidden] = useMutation(SET_REVIEW_HIDDEN);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

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

  const toggleHidden = async (review: any) => {
    await setReviewHidden({ variables: { reviewId: review.id, hidden: !review.hidden } });
    message.success(review.hidden ? 'Review unhidden' : 'Review hidden from public listing');
    refetch();
  };

  return (
    <div component="ReviewsPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Reviews</Title>
      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({
          value: r.id,
          label: r.name,
        }))}
      />

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
          renderItem={(r: any) => (
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
                  onClick={() => toggleHidden(r)}
                >
                  {r.hidden ? 'Unhide' : 'Hide'}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                    <Text strong>
                      {r.diner ? `${r.diner.firstName} ${r.diner.lastName}` : 'Guest'}
                    </Text>
                    <Text type="secondary">{new Date(r.createdAt).toLocaleDateString()}</Text>
                    {r.hidden && <Tag color="orange">Hidden</Tag>}
                  </Space>
                }
                description={
                  <>
                    <Paragraph style={{ marginBottom: 4 }}>{r.comment || <em>No comment</em>}</Paragraph>
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
                          Your reply · {new Date(r.ownerRepliedAt).toLocaleDateString()}
                        </Text>
                        <div>{r.ownerReply}</div>
                      </div>
                    )}
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="Reply to review"
        open={!!replying}
        onCancel={() => setReplying(null)}
        onOk={handleReply}
        confirmLoading={savingReply}
        okText="Post reply"
      >
        {replying && (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <div>
              <Rate disabled value={replying.rating} style={{ fontSize: 14 }} />
              <Paragraph type="secondary">{replying.comment}</Paragraph>
            </div>
            <Input.TextArea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank the guest, address their feedback…"
            />
          </Space>
        )}
      </Modal>
    </Space></div>
  );
}

export default function ReviewsPage() {
  return (
    <div component="ReviewsPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <ReviewsPageContent />
    </Suspense></div>
  );
}
