'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Button, Card, Rate, Space, Typography, message, Modal, Input } from 'antd';
import { CalendarOutlined, MessageOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { StatusTag, PageHeader, EmptyState, colors, radii, shadows, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MY_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
  CREATE_REVIEW,
} from '@/lib/graphql';

const { Text } = Typography;

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(MY_RESERVATIONS, { skip: !user });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [createReview] = useMutation(CREATE_REVIEW);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cancelFor, setCancelFor] = useState<{ id: string; name: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (!authLoading && !user) {
    router.replace('/login?next=/reservations');
    return null;
  }

  const reservations = (data as any)?.myReservations ?? [];

  const closeCancelModal = () => {
    setCancelFor(null);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelFor) return;
    const reason = cancelReason.trim();
    if (!reason) {
      message.warning('Please share a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      await updateStatus({
        variables: { id: cancelFor.id, status: 'cancelled', reason },
      });
      message.success('Reservation cancelled');
      closeCancelModal();
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div component="ReservationsPage" style={{ maxWidth: 800 }}>
      <PageHeader
        title="My reservations"
        subtitle="Upcoming and past bookings in one place"
        extra={
          <Button type="primary" icon={<SearchOutlined />} onClick={() => router.push('/')}>
            Book a table
          </Button>
        }
      />

      {loading ? (
        <Card
          loading
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
            minHeight: 180,
          }}
        />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={<CalendarOutlined />}
          title="No reservations yet"
          description="Find a restaurant and book a table in seconds — it's free."
          action={
            <Button type="primary" size="large" onClick={() => router.push('/')}>
              Find a table
            </Button>
          }
        />
      ) : (
      <Card
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
        }}
      >
          {reservations.map((r: any, idx: number, arr: any[]) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                padding: '20px 0',
                borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: radii.md,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: colors.brand[50],
                }}
              >
                {r.restaurant?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.restaurant.photos[0]}
                    alt=""
                    width={72}
                    height={72}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.brand[400],
                      fontSize: 22,
                    }}
                  >
                    <CalendarOutlined />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Space size={8} wrap>
                  <Text strong style={{ fontSize: typography.fontSize.md }}>
                    {r.restaurant?.name}
                  </Text>
                  <StatusTag status={r.status} />
                </Space>
                <Space orientation="vertical" size={0} style={{ display: 'flex', marginTop: 6 }}>
                  <Text style={{ color: colors.textSecondary }}>
                    {new Date(r.slotStart).toLocaleString()} · {r.partySize} guests
                  </Text>
                  {r.occasion !== 'none' && (
                    <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                      Occasion: {r.occasion}
                    </Text>
                  )}
                  {r.guestNotes && (
                    <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                      {r.guestNotes}
                    </Text>
                  )}
                  {r.loyaltyPointsEarned > 0 && (
                    <Text style={{ color: colors.success, fontSize: typography.fontSize.sm }}>
                      +{r.loyaltyPointsEarned} points earned
                    </Text>
                  )}
                </Space>
              </div>
              <Space wrap>
                {(r.status === 'confirmed' || r.status === 'pending') && (
                  <Link href={`/messages/${r.id}`}>
                    <Button icon={<MessageOutlined />}>Message</Button>
                  </Link>
                )}
                {(r.status === 'confirmed' || r.status === 'pending') && (
                  <Button
                    danger
                    onClick={() =>
                      setCancelFor({ id: r.id, name: r.restaurant?.name ?? 'this restaurant' })
                    }
                  >
                    Cancel
                  </Button>
                )}
                {r.status === 'completed' && (
                  <Button type="primary" ghost onClick={() => setReviewFor(r.id)}>
                    Leave review
                  </Button>
                )}
              </Space>
            </div>
          ))}
      </Card>
      )}

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
        okText="Submit review"
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

      <Modal
        title="Cancel reservation?"
        open={!!cancelFor}
        onCancel={closeCancelModal}
        onOk={confirmCancel}
        okText="Yes, cancel"
        okButtonProps={{ danger: true, loading: cancelling }}
        cancelText="Keep reservation"
        destroyOnClose
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            Cancel your reservation at <Text strong>{cancelFor?.name}</Text>? This cannot be undone.
          </Text>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Cancellation reason</Text>
            <Input.TextArea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Change of plans, running late, booked elsewhere…"
              maxLength={500}
              showCount
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
