'use client';

import { Button, Image, Rate, Typography } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { colors } from '@reservations/ui';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

type Review = {
  id?: string;
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
  photos?: string[] | null;
  createdAt?: string;
  ownerReply?: string | null;
  diner?: { firstName?: string; lastName?: string };
};

type Props = {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  canLeaveReview?: boolean;
  onLeaveReview?: () => void;
};

export function RestaurantReviewsSection({
  reviews,
  averageRating,
  reviewCount,
  canLeaveReview = false,
  onLeaveReview,
}: Props) {
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
              {(r.foodRating != null || r.serviceRating != null || r.atmosphereRating != null) && (
                <div className="rt-restaurant-review__qualities">
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
                </div>
              )}
              {r.photos && r.photos.length > 0 && (
                <div className="rt-restaurant-review__photos">
                  <Image.PreviewGroup>
                    {r.photos.map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt="Review photo"
                        width={72}
                        height={72}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </Image.PreviewGroup>
                </div>
              )}
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
