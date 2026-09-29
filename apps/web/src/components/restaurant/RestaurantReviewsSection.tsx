'use client';

import { useState } from 'react';
import { Button, Select, Typography } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import {
  DEFAULT_REVIEW_SORT,
  RESTAURANT_REVIEWS_PREVIEW_LIMIT,
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
import { RestaurantAllReviewsModal } from '@/components/restaurant/RestaurantAllReviewsModal';

const { Title, Text } = Typography;

type Props = {
  restaurantId: string;
  restaurantName: string;
  reviews: RestaurantReviewItem[];
  averageRating: number;
  reviewCount: number;
  sort?: ReviewSort;
  onSortChange?: (sort: ReviewSort) => void;
  canLeaveReview?: boolean;
  onLeaveReview?: () => void;
  currentUserId?: string | null;
  onReact?: (reviewId: string, reaction: ReviewReactionType) => Promise<void>;
};

export function RestaurantReviewsSection({
  restaurantId,
  restaurantName,
  reviews,
  averageRating,
  reviewCount,
  sort = DEFAULT_REVIEW_SORT,
  onSortChange,
  canLeaveReview = false,
  onLeaveReview,
  currentUserId,
  onReact,
}: Props) {
  const [allOpen, setAllOpen] = useState(false);
  const preview = reviews.slice(0, RESTAURANT_REVIEWS_PREVIEW_LIMIT);
  const hasMoreThanPreview = reviewCount > preview.length;

  return (
    <section id="reviews" className="rt-restaurant-section">
      <div className="rt-restaurant-section__header">
        <Title level={3} className="rt-restaurant-section__title">
          Reviews
        </Title>
        <div className="rt-restaurant-section__header-actions">
          {reviewCount > 0 && (
            <div className="rt-restaurant-reviews__summary">
              <StarFilled style={{ color: colors.rating }} />
              <Text strong>{averageRating.toFixed(1)}</Text>
              <Text type="secondary">({reviewCount} reviews)</Text>
            </div>
          )}
          {canLeaveReview && (
            <Button type="primary" icon={<StarOutlined />} onClick={onLeaveReview}>
              Leave a review
            </Button>
          )}
        </div>
      </div>

      {reviews.length === 0 ? (
        <Text type="secondary">
          {canLeaveReview
            ? 'How was your visit? Share a quick review for other diners.'
            : 'No reviews yet. Be the first to share your experience after your visit.'}
        </Text>
      ) : (
        <>
          <div className="rt-restaurant-reviews__toolbar">
            <Text type="secondary" style={{ fontSize: 13 }}>
              Showing {preview.length}
              {reviewCount > preview.length ? ` of ${reviewCount}` : ''}
            </Text>
            <Select
              value={sort}
              onChange={(value) => onSortChange?.(value)}
              options={REVIEW_SORTS.map((value) => ({
                value,
                label: REVIEW_SORT_LABELS[value],
              }))}
              aria-label="Sort reviews"
              style={{ minWidth: 168 }}
            />
          </div>

          <div className="rt-restaurant-reviews">
            {preview.map((review, idx) => (
              <RestaurantReviewCard
                key={review.id ?? idx}
                review={review}
                currentUserId={currentUserId}
                onReact={onReact}
              />
            ))}
          </div>

          {hasMoreThanPreview ? (
            <div className="rt-restaurant-reviews__footer">
              <Button type="default" size="large" onClick={() => setAllOpen(true)}>
                Show all {reviewCount} reviews
              </Button>
            </div>
          ) : null}
        </>
      )}

      <RestaurantAllReviewsModal
        open={allOpen}
        onClose={() => setAllOpen(false)}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        averageRating={averageRating}
        reviewCount={reviewCount}
        sort={sort}
        onSortChange={(next) => onSortChange?.(next)}
        currentUserId={currentUserId}
        onReact={onReact}
      />
    </section>
  );
}
