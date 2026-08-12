'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Card, Input, Modal, Select, Space, Spin, Typography, message } from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  EditOutlined,
  MessageOutlined,
  StarOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusTag, PageHeader, EmptyState, colors, radii, shadows, typography, pickRestaurantPhoto } from '@reservations/ui';
import { buildRestaurantBookingPath, RESERVATION_CANCELLATION_REASONS } from '@reservations/shared';
import DepositPayment from '@/components/DepositPayment';
import { useAuth } from '@/lib/auth';
import { addReservationToCalendar } from '@/lib/calendar';
import {
  MY_RESERVATION,
  UPDATE_RESERVATION_STATUS,
  CONFIRM_DEPOSIT,
  SAVE_RESTAURANT,
} from '@/lib/graphql';
import { EditReservationModal } from '@/components/EditReservationModal';
import { PostVisitModal } from '@/components/PostVisitModal';
import {
  canLeaveReview,
  displayReservationStatus,
  isReservationPast,
  isReservationUpcoming,
} from '@/lib/reservationDisplay';

const { Text, Title } = Typography;

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const reservationId = params.id;

  const { data, loading, refetch } = useQuery(MY_RESERVATION, {
    skip: !user || !reservationId,
    variables: { id: reservationId },
  });

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [confirmDeposit] = useMutation(CONFIRM_DEPOSIT);
  const [saveRestaurant, { loading: saving }] = useMutation(SAVE_RESTAURANT);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string | undefined>();
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?next=/reservations/${reservationId}`);
    return null;
  }

  const reservation = (data as { myReservation?: Record<string, unknown> } | undefined)?.myReservation;

  if (loading) {
    return (
      <Card
        loading
        style={{
          maxWidth: 800,
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
          minHeight: 240,
        }}
      />
    );
  }

  if (!reservation) {
    return (
      <div style={{ maxWidth: 800 }}>
        <PageHeader title="Reservation" />
        <EmptyState
          icon={<CalendarOutlined />}
          title="Reservation not found"
          description="This booking may have been removed or you may not have access to it."
          action={
            <Button type="primary" onClick={() => router.push('/reservations')}>
              Back to my reservations
            </Button>
          }
        />
      </div>
    );
  }

  const r = reservation as {
    id: string;
    status: string;
    slotStart: string;
    slotEnd?: string;
    partySize: number;
    occasion: string;
    guestNotes?: string;
    depositAmountCents: number;
    depositStatus: string;
    clientSecret?: string | null;
    loyaltyPointsEarned: number;
    hasReview?: boolean;
    restaurant?: {
      id: string;
      name: string;
      slug?: string;
      photos?: string[];
      phone?: string;
      isSaved?: boolean;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    };
    tables?: Array<{
      id: string;
      name: string;
      photoUrl?: string;
      floorArea?: string;
    }>;
  };

  const needsPayment =
    r.depositStatus === 'requires_payment' && r.depositAmountCents > 0 && !!r.clientSecret;
  const upcoming = isReservationUpcoming(r);
  const past = isReservationPast(r);
  const reviewable = canLeaveReview(r);
  const canManage = upcoming && (r.status === 'confirmed' || r.status === 'pending');
  const restaurantPath = buildRestaurantBookingPath(r.restaurant?.slug, r.restaurant?.id);
  const bookAgainHref = r.partySize
    ? `${restaurantPath}?party=${r.partySize}`
    : restaurantPath;

  const confirmCancel = async () => {
    if (!cancelReasonPreset) {
      message.warning('Please select a cancellation reason');
      throw new Error('reason required');
    }
    if (cancelReasonPreset === 'Other' && !cancelReasonDetails.trim()) {
      message.warning('Please add a few details');
      throw new Error('details required');
    }
    const reason = cancelReasonDetails.trim()
      ? `${cancelReasonPreset}: ${cancelReasonDetails.trim()}`
      : cancelReasonPreset;
    setCancelling(true);
    try {
      await updateStatus({
        variables: { id: r.id, status: 'cancelled', reason },
      });
      message.success('Reservation cancelled');
      setCancelOpen(false);
      setCancelReasonPreset(undefined);
      setCancelReasonDetails('');
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to cancel');
      throw err;
    } finally {
      setCancelling(false);
    }
  };

  const handleDepositSuccess = async () => {
    const paymentIntentId = r.clientSecret?.split('_secret')[0];
    if (paymentIntentId) {
      await confirmDeposit({ variables: { paymentIntentId } });
    }
    message.success('Deposit authorized — reservation confirmed');
    setPayOpen(false);
    refetch();
  };

  const handleSaveRestaurant = async () => {
    if (!r.restaurant?.id) return;
    try {
      await saveRestaurant({ variables: { restaurantId: r.restaurant.id } });
      message.success('Restaurant saved');
      refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save restaurant');
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/reservations')}
        style={{ marginBottom: 8, paddingLeft: 0 }}
      >
        My reservations
      </Button>

      <PageHeader
        title={
          r.restaurant?.name ? (
            <Link
              href={restaurantPath}
              style={{
                color: colors.brand[700],
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {r.restaurant.name}
            </Link>
          ) : (
            'Reservation'
          )
        }
        subtitle={new Date(r.slotStart).toLocaleString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
        extra={<StatusTag status={displayReservationStatus(r)} />}
      />

      {needsPayment && upcoming && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Deposit required to hold your table"
          description={`Authorize a $${(r.depositAmountCents / 100).toFixed(2)} deposit to confirm this reservation. The hold is only captured if you no-show.`}
          action={
            <Button
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={() => setPayOpen(true)}
            >
              Pay deposit
            </Button>
          }
        />
      )}

      {reviewable && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="How was your visit?"
          description="Leave a quick review, optionally save the restaurant, then book again when you're ready."
          action={
            <Button type="primary" icon={<StarOutlined />} onClick={() => setReviewOpen(true)}>
              Leave review
            </Button>
          }
        />
      )}

      <Card
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
          marginBottom: 16,
        }}
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {r.restaurant?.photos?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.restaurant.photos[0]}
              alt=""
              style={{
                width: '100%',
                maxHeight: 220,
                objectFit: 'cover',
                borderRadius: radii.md,
              }}
            />
          )}

          <div>
            <Text type="secondary">Party size</Text>
            <Title level={5} style={{ margin: '4px 0 0' }}>
              {r.partySize} guests
            </Title>
          </div>

          {r.occasion && r.occasion !== 'none' && (
            <div>
              <Text type="secondary">Occasion</Text>
              <div>
                <Text>{r.occasion}</Text>
              </div>
            </div>
          )}

          {r.guestNotes && (
            <div>
              <Text type="secondary">Special requests</Text>
              <div>
                <Text>{r.guestNotes}</Text>
              </div>
            </div>
          )}

          {r.tables?.[0] && (
            <div>
              <Text type="secondary">Table</Text>
              <div>
                <Text>
                  {r.tables[0].name}
                  {r.tables[0].floorArea ? ` · ${r.tables[0].floorArea}` : ''}
                </Text>
              </div>
              {r.tables[0].photoUrl && !r.tables[0].photoUrl.includes('1551782450-a2132b4ba21d') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.tables[0].photoUrl}
                  alt={r.tables[0].name}
                  style={{
                    display: 'block',
                    marginTop: 8,
                    width: '100%',
                    maxWidth: 280,
                    borderRadius: radii.md,
                    objectFit: 'cover',
                    maxHeight: 160,
                  }}
                />
              ) : r.restaurant?.photos?.length ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pickRestaurantPhoto(r.restaurant.photos)}
                  alt={r.restaurant.name}
                  style={{
                    display: 'block',
                    marginTop: 8,
                    width: '100%',
                    maxWidth: 280,
                    borderRadius: radii.md,
                    objectFit: 'cover',
                    maxHeight: 160,
                  }}
                />
              ) : null}
            </div>
          )}

          {r.restaurant?.address && (
            <div>
              <Text type="secondary">Address</Text>
              <div>
                <Text>
                  {[
                    r.restaurant.address.line1,
                    r.restaurant.address.city,
                    r.restaurant.address.state,
                    r.restaurant.address.zip,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </div>
            </div>
          )}

          {r.depositAmountCents > 0 && (
            <div>
              <Text type="secondary">Deposit</Text>
              <div>
                <Text>
                  ${(r.depositAmountCents / 100).toFixed(2)}{' '}
                  <Text type="secondary">({r.depositStatus.replace(/_/g, ' ')})</Text>
                </Text>
              </div>
            </div>
          )}

          {r.loyaltyPointsEarned > 0 && (
            <Text style={{ color: colors.success, fontSize: typography.fontSize.sm }}>
              +{r.loyaltyPointsEarned} loyalty points earned
            </Text>
          )}
        </Space>
      </Card>

      <Space wrap>
        {upcoming && (
          <Button
            icon={<CalendarOutlined />}
            onClick={() =>
              addReservationToCalendar({
                restaurant: r.restaurant,
                partySize: r.partySize,
                slotStart: r.slotStart,
                slotEnd: r.slotEnd,
                guestNotes: r.guestNotes,
              })
            }
          >
            Add to calendar
          </Button>
        )}
        {past ? (
          <Link href={bookAgainHref}>
            <Button type={reviewable ? 'default' : 'primary'} icon={<CalendarOutlined />}>
              Book again
            </Button>
          </Link>
        ) : (
          <Link href={restaurantPath}>
            <Button>View restaurant</Button>
          </Link>
        )}
        {past && r.restaurant?.id && !r.restaurant.isSaved && (
          <Button
            icon={<BookOutlined />}
            loading={saving}
            onClick={handleSaveRestaurant}
          >
            Save restaurant
          </Button>
        )}
        {canManage && (
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            Edit reservation
          </Button>
        )}
        {canManage && (
          <Link href={`/messages/${r.id}`}>
            <Button icon={<MessageOutlined />}>Message</Button>
          </Link>
        )}
        {needsPayment && upcoming && (
          <Button type="primary" icon={<CreditCardOutlined />} onClick={() => setPayOpen(true)}>
            Pay deposit
          </Button>
        )}
        {canManage && (
          <Button danger onClick={() => setCancelOpen(true)}>
            Cancel reservation
          </Button>
        )}
        {reviewable && (
          <Button type="primary" ghost icon={<StarOutlined />} onClick={() => setReviewOpen(true)}>
            Leave review
          </Button>
        )}
      </Space>

      <Modal
        title="Authorize deposit"
        open={payOpen}
        onCancel={() => setPayOpen(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        {r.clientSecret && (
          <DepositPayment
            clientSecret={r.clientSecret}
            amount={r.depositAmountCents}
            onSuccess={handleDepositSuccess}
            onCancel={() => setPayOpen(false)}
          />
        )}
      </Modal>

      <PostVisitModal
        open={reviewOpen}
        reservationId={r.id}
        partySize={r.partySize}
        restaurant={r.restaurant}
        onClose={() => setReviewOpen(false)}
        onCompleted={() => refetch()}
      />

      <Modal
        title="Cancel reservation?"
        open={cancelOpen}
        onCancel={() => {
          setCancelOpen(false);
          setCancelReasonPreset(undefined);
          setCancelReasonDetails('');
        }}
        onOk={confirmCancel}
        okText="Yes, cancel"
        okButtonProps={{
          danger: true,
          loading: cancelling,
          disabled:
            !cancelReasonPreset ||
            (cancelReasonPreset === 'Other' && !cancelReasonDetails.trim()),
        }}
        cancelText="Keep reservation"
        destroyOnClose
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            Cancel your reservation at <Text strong>{r.restaurant?.name}</Text>? This cannot be
            undone.
          </Text>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>
              Reason <Text type="danger">*</Text>
            </Text>
            <Select
              placeholder="Select a reason"
              style={{ width: '100%' }}
              value={cancelReasonPreset}
              onChange={setCancelReasonPreset}
              options={RESERVATION_CANCELLATION_REASONS.map((reason) => ({
                value: reason,
                label: reason,
              }))}
            />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>
              Additional details{' '}
              {cancelReasonPreset === 'Other' ? <Text type="danger">*</Text> : '(optional)'}
            </Text>
            <Input.TextArea
              rows={3}
              value={cancelReasonDetails}
              onChange={(e) => setCancelReasonDetails(e.target.value)}
              placeholder="e.g. Change of plans, running late, booked elsewhere…"
              maxLength={500}
              showCount
            />
          </div>
        </Space>
      </Modal>

      <EditReservationModal
        open={editOpen}
        reservation={r}
        onClose={() => setEditOpen(false)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
