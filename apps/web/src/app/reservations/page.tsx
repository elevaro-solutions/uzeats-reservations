'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Button, Card, Rate, Space, Typography, message, Modal, Input } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { StatusTag } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MY_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
  CREATE_REVIEW,
} from '@/lib/graphql';

const { Title, Text } = Typography;

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(MY_RESERVATIONS, { skip: !user });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [createReview] = useMutation(CREATE_REVIEW);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!authLoading && !user) {
    router.replace('/login?next=/reservations');
    return null;
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>My reservations</Title>
      <Card loading={loading}>
        {((data as any)?.myReservations ?? []).length === 0 && (
          <Text type="secondary">No reservations yet</Text>
        )}
        {((data as any)?.myReservations ?? []).map((r: any, idx: number, arr: any[]) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: idx < arr.length - 1 ? '1px solid #f1efed' : 'none',
            }}
          >
            {r.restaurant?.photos?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.restaurant.photos[0]}
                alt=""
                width={64}
                height={64}
                style={{ objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space>
                <Text strong>{r.restaurant?.name}</Text>
                <StatusTag status={r.status} />
              </Space>
              <Space orientation="vertical" size={0} style={{ display: 'flex', marginTop: 4 }}>
                <Text>
                  {new Date(r.slotStart).toLocaleString()} · {r.partySize} guests
                </Text>
                {r.occasion !== 'none' && <Text type="secondary">Occasion: {r.occasion}</Text>}
                {r.guestNotes && <Text type="secondary">{r.guestNotes}</Text>}
                {r.loyaltyPointsEarned > 0 && (
                  <Text type="success">+{r.loyaltyPointsEarned} points earned</Text>
                )}
              </Space>
            </div>
            <Space>
              {(r.status === 'confirmed' || r.status === 'pending') && r.restaurant?.id && (
                <Link href={`/messages/${r.restaurant.id}`}>
                  <Button icon={<MessageOutlined />}>Message restaurant</Button>
                </Link>
              )}
              {(r.status === 'confirmed' || r.status === 'pending') && (
                <Button
                  danger
                  onClick={async () => {
                    await updateStatus({
                      variables: { id: r.id, status: 'cancelled', reason: 'Cancelled by diner' },
                    });
                    message.success('Reservation cancelled');
                    refetch();
                  }}
                >
                  Cancel
                </Button>
              )}
              {r.status === 'completed' && (
                <Button type="link" onClick={() => setReviewFor(r.id)}>
                  Leave review
                </Button>
              )}
            </Space>
          </div>
        ))}
      </Card>

      <Modal
        title="Leave a review"
        open={!!reviewFor}
        onCancel={() => setReviewFor(null)}
        onOk={async () => {
          await createReview({
            variables: { input: { reservationId: reviewFor, rating, comment } },
          });
          message.success('Thanks for your review!');
          setReviewFor(null);
          setComment('');
          refetch();
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Rate value={rating} onChange={setRating} />
          <Input.TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was your visit?"
          />
        </Space>
      </Modal>
    </Space>
  );
}
