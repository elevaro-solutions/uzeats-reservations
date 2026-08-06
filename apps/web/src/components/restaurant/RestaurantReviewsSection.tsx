'use client';

import { Rate, Typography } from 'antd';
import { StarFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { colors } from '@reservations/ui';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

type Review = {
  id?: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  ownerReply?: string | null;
  diner?: { firstName?: string; lastName?: string };
};

type Props = {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
};

export function RestaurantReviewsSection({ reviews, averageRating, reviewCount }: Props) {
  return (
    <section id="reviews" className="rt-restaurant-section">
      <div className="rt-restaurant-section__header">
        <Title level={3} className="rt-restaurant-section__title">
          Reviews
        </Title>
        {reviewCount > 0 && (
          <div className="rt-restaurant-reviews__summary">
            <StarFilled style={{ color: colors.rating }} />
            <Text strong>{averageRating.toFixed(1)}</Text>
            <Text type="secondary">({reviewCount} reviews)</Text>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <Text type="secondary">No reviews yet. Be the first to share your experience after your visit.</Text>
      ) : (
        <div className="rt-restaurant-reviews">
          {reviews.map((r, idx) => (
            <article key={r.id ?? idx} className="rt-restaurant-review">
              <div className="rt-restaurant-review__header">
                <div className="rt-restaurant-review__avatar">
                  {(r.diner?.firstName?.[0] ?? 'G').toUpperCase()}
                </div>
                <div>
                  <Text strong>
                    {r.diner?.firstName} {r.diner?.lastName?.[0] ? `${r.diner.lastName[0]}.` : ''}
                  </Text>
                  <div className="rt-restaurant-review__meta">
                    <Rate disabled value={r.rating} style={{ fontSize: 12 }} />
                    {r.createdAt && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(r.createdAt).fromNow()}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
              {r.comment && <Paragraph className="rt-restaurant-review__comment">{r.comment}</Paragraph>}
              {r.ownerReply && (
                <div className="rt-restaurant-review__reply">
                  <Text strong style={{ fontSize: 13 }}>Response from the restaurant</Text>
                  <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{r.ownerReply}</Paragraph>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
