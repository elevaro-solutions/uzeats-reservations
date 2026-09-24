'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Dropdown, Input, Modal, Select, Space, Spin, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  EditOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  MoreOutlined,
  RightOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { StatusTag, EmptyState, pickRestaurantPhoto } from '@reservations/ui';
import {
  buildRestaurantBookingPath,
  RESERVATION_CANCELLATION_REASONS,
  buildReservationCancellationReason,
  OCCASION_LABELS,
  type Occasion,
} from '@reservations/shared';
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
  formatDepositStatusLabel,
  formatReservationDate,
  formatReservationReference,
  formatReservationTime,
  formatVisitAddress,
  isPlaceholderTablePhoto,
  isReservationPast,
  isReservationUpcoming,
  resolvePrimaryReservationCta,
} from '@/lib/reservationDisplay';

const { Text } = Typography;

function DetailRow({
  icon,
  label,
  value,
  trailing,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`rt-reservation-detail-row${last ? ' is-last' : ''}`}>
      <span className="rt-reservation-detail-row__icon">{icon}</span>
      <div className="rt-reservation-detail-row__copy">
        <span className="rt-reservation-detail-row__label">{label}</span>
        {trailing ?? <span className="rt-reservation-detail-row__value">{value}</span>}
      </div>
    </div>
  );
}

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
      <div className="rt-reservation-detail" style={{ textAlign: 'center', padding: 80 }}>
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
      <div className="rt-reservation-detail">
        <div className="rt-reservation-detail__topbar">
          <Button
            type="text"
            className="rt-reservation-detail__chrome-btn"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/reservations')}
            aria-label="Back to reservations"
          />
          <span className="rt-reservation-detail__top-title">Reservation</span>
          <span className="rt-reservation-detail__chrome-spacer" />
        </div>
        <div className="rt-reservation-detail__skeleton" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="rt-reservation-detail">
        <div className="rt-reservation-detail__topbar">
          <Button
            type="text"
            className="rt-reservation-detail__chrome-btn"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/reservations')}
            aria-label="Back to reservations"
          />
          <span className="rt-reservation-detail__top-title">Reservation</span>
          <span className="rt-reservation-detail__chrome-spacer" />
        </div>
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
    packageTitle?: string | null;
    packagePriceCents?: number;
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
        neighborhood?: string;
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
  const primary = resolvePrimaryReservationCta(r);
  const addressLabel = formatVisitAddress(r.restaurant?.address);
  const restaurantPhoto = r.restaurant?.photos?.length
    ? pickRestaurantPhoto(r.restaurant.photos)
    : null;
  const occasionLabel =
    r.occasion && r.occasion !== 'none'
      ? (OCCASION_LABELS[r.occasion as Occasion] ?? r.occasion)
      : null;
  const table = r.tables?.[0];
  const tablePhoto =
    table?.photoUrl && !isPlaceholderTablePhoto(table.photoUrl) ? table.photoUrl : null;
  const tableLabel = table
    ? [table.name, table.floorArea].filter(Boolean).join(' · ')
    : null;
  const showExtras =
    Boolean(tableLabel) || r.depositAmountCents > 0 || r.loyaltyPointsEarned > 0;

  const confirmCancel = async () => {
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

  const handleAddToCalendar = () => {
    const { googleUrl } = addReservationToCalendar({
      restaurant: r.restaurant,
      partySize: r.partySize,
      slotStart: r.slotStart,
      slotEnd: r.slotEnd,
      guestNotes: r.guestNotes,
    });
    message.success({
      content: (
        <span>
          Calendar file downloaded.{' '}
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            Add in Google Calendar
          </a>
        </span>
      ),
      duration: 6,
    });
  };

  const moreItems: NonNullable<MenuProps['items']> = [];
  if (canManage) {
    moreItems.push({
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit reservation',
      onClick: () => setEditOpen(true),
    });
    moreItems.push({
      key: 'message',
      icon: <MessageOutlined />,
      label: 'Message restaurant',
      onClick: () => router.push(`/messages/${r.id}`),
    });
  }
  if (upcoming) {
    moreItems.push({
      key: 'calendar',
      icon: <CalendarOutlined />,
      label: 'Add to calendar',
      onClick: handleAddToCalendar,
    });
  }
  if (past && primary !== 'book_again') {
    moreItems.push({
      key: 'book-again',
      icon: <CalendarOutlined />,
      label: 'Book again',
      onClick: () => router.push(bookAgainHref),
    });
  }
  if (!past) {
    moreItems.push({
      key: 'view',
      icon: <EnvironmentOutlined />,
      label: 'View restaurant',
      onClick: () => router.push(restaurantPath),
    });
  }
  if (r.depositAmountCents > 0) {
    moreItems.push({
      key: 'billing',
      icon: <CreditCardOutlined />,
      label: 'Billing & invoices',
      onClick: () => router.push('/billing'),
    });
  }
  if (past && r.restaurant?.id && !r.restaurant.isSaved) {
    moreItems.push({
      key: 'save',
      icon: <BookOutlined />,
      label: saving ? 'Saving…' : 'Save restaurant',
      onClick: () => void handleSaveRestaurant(),
    });
  }
  if (reviewable && primary !== 'leave_review') {
    moreItems.push({
      key: 'review',
      icon: <StarOutlined />,
      label: 'Leave a review',
      onClick: () => setReviewOpen(true),
    });
  }
  if (canManage) {
    moreItems.push({
      key: 'cancel',
      danger: true,
      label: 'Cancel reservation',
      onClick: () => setCancelOpen(true),
    });
  }

  const primaryLabel =
    primary === 'pay_deposit' && needsPayment
      ? `Pay deposit · $${(r.depositAmountCents / 100).toFixed(2)}`
      : primary === 'pay_deposit'
        ? 'Pay deposit'
        : primary === 'leave_review'
          ? 'Leave a review'
          : primary === 'book_again'
            ? 'Book again'
            : null;

  const handlePrimary = () => {
    if (primary === 'pay_deposit') setPayOpen(true);
    else if (primary === 'leave_review') setReviewOpen(true);
    else if (primary === 'book_again') router.push(bookAgainHref);
  };

  return (
    <div className={`rt-reservation-detail${primary ? ' has-sticky-cta' : ''}`}>
      <div className="rt-reservation-detail__topbar">
        <Button
          type="text"
          className="rt-reservation-detail__chrome-btn"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/reservations')}
          aria-label="Back to reservations"
        />
        <span className="rt-reservation-detail__top-title">Reservation</span>
        {moreItems.length > 0 ? (
          <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              className="rt-reservation-detail__chrome-btn"
              icon={<MoreOutlined />}
              aria-label="More actions"
            />
          </Dropdown>
        ) : (
          <span className="rt-reservation-detail__chrome-spacer" />
        )}
      </div>

      <div className="rt-reservation-detail__body">
        {needsPayment && upcoming && (
          <Alert
            type="warning"
            showIcon
            className="rt-reservation-detail__alert"
            message="Deposit required to hold your table"
            description={`Authorize a $${(r.depositAmountCents / 100).toFixed(2)} deposit to confirm this reservation. The hold is only captured if you no-show.`}
          />
        )}

        {reviewable && (
          <Alert
            type="info"
            showIcon
            className="rt-reservation-detail__alert"
            message="How was your visit?"
            description="Leave a quick review, optionally save the restaurant, then book again when you're ready."
          />
        )}

        <button
          type="button"
          className="rt-reservation-restaurant-card"
          onClick={() => router.push(restaurantPath)}
        >
          <div className="rt-reservation-restaurant-card__thumb">
            {restaurantPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurantPhoto} alt="" width={64} height={64} />
            ) : (
              <span className="rt-reservation-restaurant-card__thumb-fallback">
                <CalendarOutlined />
              </span>
            )}
          </div>
          <div className="rt-reservation-restaurant-card__copy">
            <span className="rt-reservation-restaurant-card__name">
              {r.restaurant?.name ?? 'Restaurant'}
            </span>
            {addressLabel ? (
              <span className="rt-reservation-restaurant-card__address">{addressLabel}</span>
            ) : null}
          </div>
          <RightOutlined className="rt-reservation-restaurant-card__chevron" />
        </button>

        <section className="rt-reservation-detail-section">
          <div className="rt-reservation-detail-section__header">
            <h2>Details</h2>
            {canManage ? (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                className="rt-reservation-detail-section__edit"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            ) : null}
          </div>
          <div className="rt-reservation-detail-card">
            <DetailRow
              label="Status"
              icon={<InfoCircleOutlined />}
              trailing={<StatusTag status={displayReservationStatus(r)} />}
            />
            <DetailRow
              label="Date"
              value={formatReservationDate(r.slotStart)}
              icon={<CalendarOutlined />}
            />
            <DetailRow
              label="Time"
              value={formatReservationTime(r.slotStart, r.slotEnd)}
              icon={<ClockCircleOutlined />}
            />
            <DetailRow
              label="Party"
              value={`${r.partySize} guest${r.partySize === 1 ? '' : 's'}`}
              icon={<TeamOutlined />}
            />
            {occasionLabel ? (
              <DetailRow label="Occasion" value={occasionLabel} icon={<GiftOutlined />} />
            ) : null}
            {r.packageTitle ? (
              <DetailRow
                label="Package"
                value={[
                  r.packageTitle,
                  (r.packagePriceCents ?? 0) > 0
                    ? `$${(r.packagePriceCents! / 100).toFixed(2)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                icon={<GiftOutlined />}
              />
            ) : null}
            <DetailRow
              label="Confirmation"
              value={formatReservationReference(r.id)}
              icon={<CheckOutlined />}
              last={!r.guestNotes}
            />
            {r.guestNotes ? (
              <DetailRow
                label="Notes"
                value={r.guestNotes}
                icon={<InfoCircleOutlined />}
                last
              />
            ) : null}
          </div>
        </section>

        {showExtras ? (
          <section className="rt-reservation-detail-section">
            <div className="rt-reservation-detail-section__header">
              <h2>Extras</h2>
            </div>
            <div className="rt-reservation-detail-card">
              {tableLabel ? (
                <div
                  className={`rt-reservation-detail-row${
                    r.depositAmountCents > 0 || r.loyaltyPointsEarned > 0 ? '' : ' is-last'
                  }`}
                >
                  {tablePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tablePhoto}
                      alt=""
                      className="rt-reservation-detail-row__table-thumb"
                      width={44}
                      height={44}
                    />
                  ) : (
                    <span className="rt-reservation-detail-row__icon">
                      <TeamOutlined />
                    </span>
                  )}
                  <div className="rt-reservation-detail-row__copy">
                    <span className="rt-reservation-detail-row__label">Table</span>
                    <span className="rt-reservation-detail-row__value">{tableLabel}</span>
                  </div>
                </div>
              ) : null}
              {r.depositAmountCents > 0 ? (
                <DetailRow
                  label="Deposit"
                  value={`$${(r.depositAmountCents / 100).toFixed(2)} · ${formatDepositStatusLabel(r.depositStatus)}`}
                  icon={<CreditCardOutlined />}
                  last={r.loyaltyPointsEarned <= 0}
                />
              ) : null}
              {r.loyaltyPointsEarned > 0 ? (
                <DetailRow
                  label="Loyalty"
                  value={`+${r.loyaltyPointsEarned} points earned`}
                  icon={<StarOutlined />}
                  last
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="rt-reservation-detail__desktop-actions">
          <Space wrap>
            {upcoming && (
              <Button icon={<CalendarOutlined />} onClick={handleAddToCalendar}>
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
            {reviewable && (
              <Button type="primary" icon={<StarOutlined />} onClick={() => setReviewOpen(true)}>
                Leave a review
              </Button>
            )}
            {canManage && (
              <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canManage && (
              <Button danger onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            )}
          </Space>
        </div>
      </div>

      {primary && primaryLabel ? (
        <div className="rt-reservation-detail__sticky-cta">
          <Button type="primary" size="large" block onClick={handlePrimary}>
            {primaryLabel}
          </Button>
        </div>
      ) : null}

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
