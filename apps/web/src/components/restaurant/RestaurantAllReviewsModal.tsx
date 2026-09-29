'use client';

import { useEffect, useState } from 'react';
import { Button, Modal, Select, Spin, Typography } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { useQuery } from '@apollo/client/react';
import {
  REVIEW_SORT_LABELS,
  REVIEW_SORTS,
  type ReviewReactionType,
  type ReviewSort,
} from '@reservations/shared';
import { colors } from '@reservations/ui';
import {
  RestaurantReviewCard,
  type RestaurantReviewItem,
} from '@/components/restaurant/RestaurantReviewCard';
import { RESTAURANT_REVIEWS } from '@/lib/graphql';

const { Title, Text } = Typography;

const PAGE_SIZE = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  averageRating: number;
  reviewCount: number;
  sort: ReviewSort;
  onSortChange: (sort: ReviewSort) => void;
  currentUserId?: string | null;
  onReact?: (reviewId: string, reaction: ReviewReactionType) => Promise<void>;
};

export function RestaurantAllReviewsModal({
  open,
  onClose,
  restaurantId,
  restaurantName,
  averageRating,
  reviewCount,
  sort,
  onSortChange,
  currentUserId,
  onReact,
}: Props) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!open) return;
    setLimit(PAGE_SIZE);
  }, [open, sort, restaurantId]);

  const { data, loading, refetch } = useQuery(RESTAURANT_REVIEWS, {
    variables: { restaurantId, limit, offset: 0, sort },
    skip: !open || !restaurantId,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const connection = (
    data as
      | {
          restaurantReviews?: {
            total?: number;
            items?: RestaurantReviewItem[];
          };
        }
      | undefined
  )?.restaurantReviews;
  const items = connection?.items ?? [];
  const total = connection?.total ?? reviewCount;
  const hasMore = items.length < total && limit < 100;
  const initialLoading = loading && items.length === 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      className="rt-restaurant-reviews-browser"
      title={null}
      closable={false}
      styles={{
        body: { padding: 0, maxHeight: 'min(86vh, 820px)', overflow: 'hidden' },
      }}
    >
      <div className="rt-restaurant-reviews-browser__header">
        <div>
          <Title level={4} className="rt-restaurant-reviews-browser__title">
            Reviews
          </Title>
          <Text type="secondary" className="rt-restaurant-reviews-browser__subtitle">
            {restaurantName}
            {total > 0 ? (
              <>
                {' · '}
                <StarFilled style={{ color: colors.rating, fontSize: 12 }} />{' '}
                {averageRating.toFixed(1)} ({total})
              </>
            ) : null}
          </Text>
        </div>
        <div className="rt-restaurant-reviews-browser__header-actions">
          <Select
            value={sort}
            onChange={onSortChange}
            options={REVIEW_SORTS.map((value) => ({
              value,
              label: REVIEW_SORT_LABELS[value],
            }))}
            aria-label="Sort reviews"
            style={{ minWidth: 160 }}
          />
          <button
            type="button"
            className="rt-restaurant-reviews-browser__close"
            aria-label="Close reviews"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <div className="rt-restaurant-reviews-browser__body">
        {initialLoading ? (
          <div className="rt-restaurant-reviews-browser__empty">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <div className="rt-restaurant-reviews-browser__empty">
            <Text type="secondary">No reviews yet.</Text>
          </div>
        ) : (
          <div className="rt-restaurant-reviews">
            {items.map((review, idx) => (
              <RestaurantReviewCard
                key={review.id ?? idx}
                review={review}
                currentUserId={currentUserId}
                onReact={
                  onReact
                    ? async (reviewId, reaction) => {
                        await onReact(reviewId, reaction);
                        await refetch();
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="rt-restaurant-reviews-browser__more">
            <Button loading={loading} onClick={() => setLimit((value) => value + PAGE_SIZE)}>
              Load more reviews
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
