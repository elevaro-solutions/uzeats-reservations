'use client';

import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Image,
  List,
  Rate,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { browserMediaUrl, buildRestaurantBookingPath } from '@reservations/shared';
import { EmptyState, PageHeader, colors, radii } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_REVIEWS } from '@/lib/graphql';

const { Text, Paragraph } = Typography;

type MyReview = {
  id: string;
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
  photos: string[];
  ownerReply?: string | null;
  ownerRepliedAt?: string | null;
  hidden: boolean;
  createdAt: string;
  reservationId: string;
  restaurant?: {
    id: string;
    name: string;
    slug?: string | null;
    logoUrl?: string | null;
    cuisine?: string | null;
    address?: { city?: string | null; state?: string | null } | null;
  } | null;
};

export default function MyReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data, loading } = useQuery(MY_REVIEWS, {
    skip: !user,
    variables: { limit: 50, offset: 0 },
  });

  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login?next=/reviews');
    return null;
  }

  const reviews: MyReview[] = (data as { myReviews?: { items?: MyReview[] } } | undefined)
    ?.myReviews?.items ?? [];

  return (
    <div component="MyReviewsPage" style={{ maxWidth: 800 }}>
      <PageHeader
        title="My reviews"
        subtitle="Ratings and comments you’ve shared after dining"
        extra={
          <Button type="primary" icon={<SearchOutlined />} onClick={() => router.push('/')}>
            Find restaurants
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<StarOutlined />}
          title="No reviews yet"
          description="After a visit, you can rate the restaurant from your reservations. Your reviews will show up here."
          action={
            <Button type="primary" size="large" onClick={() => router.push('/reservations')}>
              My reservations
            </Button>
          }
        />
      ) : (
        <List
          dataSource={reviews}
          renderItem={(review) => {
            const restaurant = review.restaurant;
            const restaurantPath = restaurant
              ? buildRestaurantBookingPath(restaurant.slug, restaurant.id)
              : null;
            const location = [restaurant?.address?.city, restaurant?.address?.state]
              .filter(Boolean)
              .join(', ');

            return (
              <List.Item style={{ padding: 0, marginBottom: 16, border: 'none' }}>
                <Card
                  styles={{ body: { padding: 20 } }}
                  style={{
                    width: '100%',
                    borderRadius: radii.lg,
                    borderColor: colors.bordersubtle,
                  }}
                >
                  <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Space size={12} align="start">
                        {restaurant?.logoUrl ? (
                          <Image
                            src={browserMediaUrl(restaurant.logoUrl)}
                            alt=""
                            width={48}
                            height={48}
                            preview={false}
                            style={{ objectFit: 'cover', borderRadius: radii.md }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: radii.md,
                              background: colors.brand[50],
                              color: colors.brand[600],
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                            }}
                          >
                            {(restaurant?.name ?? '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          {restaurantPath ? (
                            <Button
                              type="link"
                              onClick={() => router.push(restaurantPath)}
                              style={{ padding: 0, height: 'auto', fontWeight: 600 }}
                            >
                              {restaurant?.name ?? 'Restaurant'}
                            </Button>
                          ) : (
                            <Text strong>{restaurant?.name ?? 'Restaurant'}</Text>
                          )}
                          <div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {[restaurant?.cuisine, location].filter(Boolean).join(' · ') ||
                                'Your visit'}
                            </Text>
                          </div>
                        </div>
                      </Space>
                      <Space size={8} wrap>
                        {review.hidden ? <Tag>Not public</Tag> : null}
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          <CalendarOutlined style={{ marginRight: 6 }} />
                          {dayjs(review.createdAt).format('MMM D, YYYY')}
                        </Text>
                      </Space>
                    </div>

                    <Rate disabled value={review.rating} style={{ fontSize: 16 }} />

                    {(review.foodRating != null ||
                      review.serviceRating != null ||
                      review.atmosphereRating != null) && (
                      <Space size={16} wrap>
                        {review.foodRating != null && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Food {review.foodRating}/5
                          </Text>
                        )}
                        {review.serviceRating != null && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Service {review.serviceRating}/5
                          </Text>
                        )}
                        {review.atmosphereRating != null && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Atmosphere {review.atmosphereRating}/5
                          </Text>
                        )}
                      </Space>
                    )}

                    {review.comment?.trim() ? (
                      <Paragraph style={{ marginBottom: 0 }}>{review.comment}</Paragraph>
                    ) : null}

                    {review.photos.length > 0 && (
                      <Image.PreviewGroup>
                        <Space size={8} wrap>
                          {review.photos.map((url) => (
                            <Image
                              key={url}
                              src={browserMediaUrl(url)}
                              alt="Review photo"
                              width={72}
                              height={72}
                              style={{ objectFit: 'cover', borderRadius: 8 }}
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    )}

                    {review.ownerReply ? (
                      <div
                        style={{
                          background: colors.brand[50],
                          borderRadius: radii.md,
                          padding: '12px 14px',
                        }}
                      >
                        <Text strong style={{ fontSize: 13 }}>
                          Response from the restaurant
                        </Text>
                        {review.ownerRepliedAt ? (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                            {dayjs(review.ownerRepliedAt).format('MMM D, YYYY')}
                          </Text>
                        ) : null}
                        <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                          {review.ownerReply}
                        </Paragraph>
                      </div>
                    ) : null}

                    <Button
                      type="link"
                      style={{ padding: 0, alignSelf: 'flex-start' }}
                      onClick={() => router.push(`/reservations/${review.reservationId}`)}
                    >
                      View reservation
                    </Button>
                  </Space>
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
