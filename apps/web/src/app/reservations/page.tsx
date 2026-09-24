'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  Button,
  Dropdown,
  Space,
  Typography,
  message,
  Modal,
  Input,
  Select,
  Spin,
  Segmented,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  SearchOutlined,
  CreditCardOutlined,
  EditOutlined,
  MoreOutlined,
  CloseCircleOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { StatusTag, PageHeader, EmptyState, pickRestaurantPhoto } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RESERVATION_CANCELLATION_REASONS, buildRestaurantBookingPath, buildReservationCancellationReason } from '@reservations/shared';
import {
  MY_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { EditReservationModal } from '@/components/EditReservationModal';
import { PostVisitModal } from '@/components/PostVisitModal';
import {
  canLeaveReview,
  defaultReservationSegment,
  displayReservationStatus,
  filterReservationsBySegment,
  formatReservationDate,
  formatReservationTime,
  formatVisitAddress,
  isReservationPast,
  isReservationUpcoming,
  needsDepositPayment,
  type ReservationListSegment,
} from '@/lib/reservationDisplay';

function bookAgainPath(r: {
  partySize?: number;
  restaurant?: { id?: string; slug?: string } | null;
}): string {
  const path = buildRestaurantBookingPath(r.restaurant?.slug, r.restaurant?.id);
  if (!r.partySize) return path;
  return `${path}?party=${r.partySize}`;
}

const { Text } = Typography;

type ReviewTarget = {
  id: string;
  partySize?: number;
  restaurant?: {
    id?: string;
    name?: string;
    slug?: string;
    isSaved?: boolean;
  } | null;
};

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(MY_RESERVATIONS, {
    skip: !user,
    fetchPolicy: 'network-only',
  });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [reviewFor, setReviewFor] = useState<ReviewTarget | null>(null);
  const [cancelFor, setCancelFor] = useState<{ id: string; name: string } | null>(null);
  const [editFor, setEditFor] = useState<any | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string | undefined>();
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [segment, setSegment] = useState<ReservationListSegment>('upcoming');
  const [segmentInitialized, setSegmentInitialized] = useState(false);

  const reservations = (data as any)?.myReservations ?? [];
  const upcomingCount = reservations.filter(isReservationUpcoming).length;
  const pastCount = reservations.filter(isReservationPast).length;
  const depositCount = reservations.filter(needsDepositPayment).length;
  const filtered = filterReservationsBySegment(reservations, segment);

  useEffect(() => {
    if (loading || segmentInitialized || reservations.length === 0) return;
    setSegment(defaultReservationSegment(reservations));
    setSegmentInitialized(true);
  }, [loading, reservations, segmentInitialized]);

  useEffect(() => {
    if (segment === 'deposit' && depositCount === 0 && segmentInitialized) {
      setSegment(upcomingCount > 0 ? 'upcoming' : 'past');
    }
  }, [segment, depositCount, upcomingCount, segmentInitialized]);

  if (authLoading) {
    return (
      <div className="rt-reservations-page" style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login?next=/reservations');
    return null;
  }

  const closeCancelModal = () => {
    setCancelFor(null);
    setCancelReasonPreset(undefined);
    setCancelReasonDetails('');
  };

  const confirmCancel = async () => {
    if (!cancelFor) return;
    if (!cancelReasonPreset) {
      message.warning('Please select a cancellation reason');
      throw new Error('reason required');
    }
    if (cancelReasonPreset === 'Other' && !cancelReasonDetails.trim()) {
      message.warning('Please add a few details');
      throw new Error('details required');
    }
    const reason = buildReservationCancellationReason(cancelReasonPreset, cancelReasonDetails);
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

  const emptyCopy: Record<
    ReservationListSegment,
    { title: string; description: string }
  > = {
    upcoming: {
      title: 'No upcoming reservations',
      description: 'Book a table for your next night out — it only takes a minute.',
    },
    past: {
      title: 'No past reservations',
      description: 'Completed and cancelled bookings will show up here.',
    },
    deposit: {
      title: 'No deposits due',
      description: 'When a restaurant requires a deposit, it will appear in this list.',
    },
  };

  return (
    <div className="rt-reservations-page">
      <div className="rt-reservations-page__header">
        <PageHeader
          title="Reservations"
          subtitle={
            <span className="rt-reservations-page__subtitle">
              Upcoming, past, and deposits in one place
            </span>
          }
          extra={
            <Space wrap className="rt-reservations-page__header-actions">
              <Button className="rt-reservations-page__billing" onClick={() => router.push('/billing')}>
                Billing
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => router.push('/')}>
                Book a table
              </Button>
            </Space>
          }
        />
      </div>

      {loading ? (
        <div className="rt-reservation-list rt-reservation-list--loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rt-reservation-list-card rt-reservation-list-card--skeleton" />
          ))}
        </div>
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
        <>
          <div className="rt-reservations-page__segments">
            <Segmented
              value={segment}
              onChange={(value) => setSegment(value as ReservationListSegment)}
              options={[
                { label: `Upcoming (${upcomingCount})`, value: 'upcoming' },
                ...(depositCount > 0
                  ? [{ label: `Deposit (${depositCount})`, value: 'deposit' as const }]
                  : []),
                { label: `Past (${pastCount})`, value: 'past' },
              ]}
              block
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarOutlined />}
              title={emptyCopy[segment].title}
              description={emptyCopy[segment].description}
              action={
                segment !== 'past' ? (
                  <Button type="primary" onClick={() => router.push('/')}>
                    Find a table
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rt-reservation-list">
              {filtered.map((r: any) => {
                const needsPayment = needsDepositPayment(r);
                const upcoming = isReservationUpcoming(r);
                const past = isReservationPast(r);
                const reviewable = canLeaveReview(r);
                const addressLabel = formatVisitAddress(r.restaurant?.address);
                const photo = r.restaurant?.photos?.length
                  ? pickRestaurantPhoto(r.restaurant.photos)
                  : null;

                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    className="rt-reservation-list-card"
                    onClick={() => router.push(`/reservations/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/reservations/${r.id}`);
                      }
                    }}
                  >
                    <div className="rt-reservation-list-card__top">
                      <div className="rt-reservation-list-card__thumb">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" width={48} height={48} />
                        ) : (
                          <span className="rt-reservation-list-card__thumb-fallback">
                            <CalendarOutlined />
                          </span>
                        )}
                      </div>
                      <div className="rt-reservation-list-card__heading">
                        <Link
                          href={`/reservations/${r.id}`}
                          className="rt-reservation-list-card__name"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.restaurant?.name ?? 'Restaurant'}
                        </Link>
                        {addressLabel ? (
                          <Text type="secondary" className="rt-reservation-list-card__address">
                            {addressLabel}
                          </Text>
                        ) : null}
                      </div>
                      <div className="rt-reservation-list-card__top-end">
                        <StatusTag status={displayReservationStatus(r)} />
                        {upcoming && (r.status === 'confirmed' || r.status === 'pending') && (
                          <div
                            className="rt-reservation-list-card__overflow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: 'edit',
                                    icon: <EditOutlined />,
                                    label: 'Edit',
                                    onClick: () => setEditFor(r),
                                  },
                                  {
                                    key: 'message',
                                    icon: <MessageOutlined />,
                                    label: 'Message',
                                    onClick: () => router.push(`/messages/${r.id}`),
                                  },
                                  {
                                    key: 'cancel',
                                    icon: <CloseCircleOutlined />,
                                    label: 'Cancel',
                                    danger: true,
                                    onClick: () =>
                                      setCancelFor({
                                        id: r.id,
                                        name: r.restaurant?.name ?? 'this restaurant',
                                      }),
                                  },
                                ] satisfies MenuProps['items'],
                              }}
                              trigger={['click']}
                              placement="bottomRight"
                            >
                              <Button
                                size="small"
                                icon={<MoreOutlined />}
                                aria-label="More actions"
                              />
                            </Dropdown>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rt-reservation-list-card__meta">
                      <span>
                        <CalendarOutlined />
                        {formatReservationDate(r.slotStart)}
                      </span>
                      <span>
                        <ClockCircleOutlined />
                        {formatReservationTime(r.slotStart, r.slotEnd)}
                      </span>
                      <span>
                        <TeamOutlined />
                        {r.partySize}
                      </span>
                    </div>

                    {needsPayment ? (
                      <div className="rt-reservation-list-card__deposit">
                        Deposit due · ${((r.depositAmountCents ?? 0) / 100).toFixed(2)}
                      </div>
                    ) : null}

                    {reviewable ? (
                      <div className="rt-reservation-list-card__review-cue">Review pending</div>
                    ) : null}

                    {needsPayment || reviewable || (past && r.restaurant?.id) ? (
                      <div
                        className="rt-reservation-list-card__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {needsPayment && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CreditCardOutlined />}
                            onClick={() => router.push(`/reservations/${r.id}`)}
                          >
                            Pay deposit
                          </Button>
                        )}
                        {reviewable && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<StarOutlined />}
                            onClick={() =>
                              setReviewFor({
                                id: r.id,
                                partySize: r.partySize,
                                restaurant: r.restaurant,
                              })
                            }
                          >
                            Leave a review
                          </Button>
                        )}
                        {past && r.restaurant?.id && (
                          <Button
                            size="small"
                            icon={<CalendarOutlined />}
                            onClick={() => router.push(bookAgainPath(r))}
                          >
                            Book again
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <PostVisitModal
        open={!!reviewFor}
        reservationId={reviewFor?.id ?? null}
        partySize={reviewFor?.partySize}
        restaurant={reviewFor?.restaurant}
        onClose={() => setReviewFor(null)}
        onCompleted={() => refetch()}
      />

      <Modal
        title="Cancel reservation?"
        open={!!cancelFor}
        onCancel={closeCancelModal}
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
            Cancel your reservation at <Text strong>{cancelFor?.name}</Text>? This cannot be undone.
          </Text>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>
              Reason <Text type="danger">*</Text>
            </Text>
            <Select
              allowClear
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
            <Text style={{ display: 'block', marginBottom: 6 }}>Additional details (optional)</Text>
            <Input.TextArea
              rows={3}
              value={cancelReasonDetails}
              onChange={(e) => setCancelReasonDetails(e.target.value)}
              placeholder={
                cancelReasonPreset === 'Other'
                  ? 'Tell us more about why you are cancelling…'
                  : 'Add any extra context for the restaurant…'
              }
              maxLength={500}
              showCount
            />
          </div>
        </Space>
      </Modal>

      <EditReservationModal
        open={!!editFor}
        reservation={editFor}
        onClose={() => setEditFor(null)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
