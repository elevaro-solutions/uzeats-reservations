'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  Button,
  Card,
  Dropdown,
  Space,
  Typography,
  message,
  Modal,
  Input,
  Select,
  Spin,
  Tag,
  Segmented,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  MessageOutlined,
  SearchOutlined,
  CreditCardOutlined,
  RightOutlined,
  EditOutlined,
  MoreOutlined,
  CloseCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { StatusTag, PageHeader, EmptyState, colors, radii, shadows, typography, pickRestaurantPhoto } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RESERVATION_CANCELLATION_REASONS, buildRestaurantBookingPath } from '@reservations/shared';
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
  isReservationPast,
  isReservationUpcoming,
  needsDepositPayment,
  type ReservationListSegment,
} from '@/lib/reservationDisplay';

function buildCancellationReason(preset: string, details: string): string | undefined {
  const trimmedDetails = details.trim();
  if (preset && trimmedDetails) return `${preset}: ${trimmedDetails}`;
  if (preset) return preset;
  if (trimmedDetails) return trimmedDetails;
  return undefined;
}

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
      <div style={{ textAlign: 'center', padding: 80 }}>
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
    const reason = buildCancellationReason(cancelReasonPreset, cancelReasonDetails);
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
    <div style={{ maxWidth: 800 }}>
      <PageHeader
        title="My reservations"
        subtitle="Upcoming, past, and deposits in one place"
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
        <>
          <div style={{ marginBottom: 16 }}>
            <Segmented
              value={segment}
              onChange={(value) => setSegment(value as ReservationListSegment)}
              options={[
                { label: `Upcoming (${upcomingCount})`, value: 'upcoming' },
                ...(depositCount > 0
                  ? [{ label: `Needs deposit (${depositCount})`, value: 'deposit' as const }]
                  : []),
                { label: `Past (${pastCount})`, value: 'past' },
              ]}
              block
              style={{ fontWeight: typography.fontWeight.semibold }}
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
            <Card
              style={{
                borderRadius: radii.lg,
                border: `1px solid ${colors.bordersubtle}`,
                boxShadow: shadows.sm,
              }}
            >
              {filtered.map((r: any, idx: number, arr: any[]) => {
                const needsPayment = needsDepositPayment(r);
                const upcoming = isReservationUpcoming(r);
                const past = isReservationPast(r);
                const reviewable = canLeaveReview(r);
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/reservations/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/reservations/${r.id}`);
                      }
                    }}
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'flex-start',
                      padding: '20px 0',
                      borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
                      flexWrap: 'wrap',
                      cursor: 'pointer',
                      borderRadius: radii.md,
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.brand[50];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
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
                          src={pickRestaurantPhoto(r.restaurant.photos)}
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
                        <Link
                          href={`/reservations/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: colors.brand[700],
                            fontWeight: 600,
                            fontSize: typography.fontSize.md,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {r.restaurant?.name}
                        </Link>
                        <StatusTag status={displayReservationStatus(r)} />
                        {needsPayment && <Tag color="gold">Deposit due</Tag>}
                        {reviewable && <Tag color="blue">Review pending</Tag>}
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
                        {r.tables?.[0] && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                              Table: {r.tables[0].name}
                              {r.tables[0].floorArea ? ` · ${r.tables[0].floorArea}` : ''}
                            </Text>
                            {r.tables[0].photoUrl &&
                              !r.tables[0].photoUrl.includes('1551782450-a2132b4ba21d') && (
                              <img
                                src={r.tables[0].photoUrl}
                                alt={r.tables[0].name}
                                style={{
                                  display: 'block',
                                  marginTop: 8,
                                  width: '100%',
                                  maxWidth: 220,
                                  borderRadius: radii.md,
                                  objectFit: 'cover',
                                  maxHeight: 120,
                                }}
                              />
                            )}
                          </div>
                        )}
                        {r.loyaltyPointsEarned > 0 && (
                          <Text style={{ color: colors.success, fontSize: typography.fontSize.sm }}>
                            +{r.loyaltyPointsEarned} points earned
                          </Text>
                        )}
                        {r.packageTitle && (
                          <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
                            Package: {r.packageTitle}
                            {r.packagePriceCents > 0
                              ? ` (+$${(r.packagePriceCents / 100).toFixed(2)})`
                              : ''}
                          </Text>
                        )}
                      </Space>
                    </div>
                    <Space wrap onClick={(e) => e.stopPropagation()}>
                      {needsPayment && (
                        <Button
                          type="primary"
                          icon={<CreditCardOutlined />}
                          onClick={() => router.push(`/reservations/${r.id}`)}
                        >
                          Pay deposit
                        </Button>
                      )}
                      {reviewable && (
                        <Button
                          type="primary"
                          ghost
                          icon={<StarOutlined />}
                          onClick={() =>
                            setReviewFor({
                              id: r.id,
                              partySize: r.partySize,
                              restaurant: r.restaurant,
                            })
                          }
                        >
                          Leave review
                        </Button>
                      )}
                      {past && r.restaurant?.id && (
                        <Button
                          icon={<CalendarOutlined />}
                          onClick={() => router.push(bookAgainPath(r))}
                        >
                          Book again
                        </Button>
                      )}
                      {upcoming && (r.status === 'confirmed' || r.status === 'pending') && (
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
                          <Button icon={<MoreOutlined />} aria-label="More actions" />
                        </Dropdown>
                      )}
                      <Button
                        type="text"
                        icon={<RightOutlined />}
                        onClick={() => router.push(`/reservations/${r.id}`)}
                      >
                        Details
                      </Button>
                    </Space>
                  </div>
                );
              })}
            </Card>
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
