'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Col, Modal, Row, Space, Spin, Typography, message } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  formatTimeInTimeZone,
  formatUsDateTime,
  restaurantTimeZone,
} from '@reservations/shared';
import { EmptyState, PageHeader, StatusTag, colors, radii, shadows, spacing, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  DELETE_RESERVATION,
  MY_RESTAURANTS,
  RESTAURANT_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import {
  formatDepositStatus,
  formatOccasion,
  formatSource,
  formatUsd,
  guestInitials,
  guestName as formatGuestName,
} from '@/lib/reservationFormat';

const { Text, Title } = Typography;

type ReservationDetail = {
  id: string;
  restaurantId: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string | null;
  occasion?: string | null;
  guestNotes?: string | null;
  source?: string | null;
  depositAmountCents?: number | null;
  depositStatus?: string | null;
  experienceTitle?: string | null;
  experiencePriceCents?: number | null;
  experienceTicketQty?: number | null;
  packageTitle?: string | null;
  packagePriceCents?: number | null;
  privateDiningSpaceName?: string | null;
  privateDiningPriceCents?: number | null;
  seatedAt?: string | null;
  createdAt?: string | null;
  diner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
  tables?: { id: string; name: string; floorArea?: string; photoUrl?: string }[];
  restaurant?: {
    id: string;
    name: string;
    address?: { line1?: string; city?: string; state?: string; zip?: string; country?: string };
    location?: { lat?: number; lng?: number };
  } | null;
};

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
        minWidth: 128,
        padding: '14px 16px',
        background: colors.surface,
        borderRadius: radii.md,
        border: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: typography.letterSpacing.wide,
          textTransform: 'uppercase',
          color: colors.textTertiary,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.snug,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${colors.bordersubtle}`,
      }}
    >
      <Text type="secondary" style={{ fontSize: typography.fontSize.sm, paddingTop: 2 }}>
        {label}
      </Text>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ReservationDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const reservationId = params.id;

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { setRestaurantId } = usePartnerRestaurant(restaurants);

  const { data, loading, refetch } = useQuery(RESTAURANT_RESERVATION, {
    skip: !user || !reservationId,
    variables: { id: reservationId },
  });
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [deleteReservation, { loading: deleting }] = useMutation(DELETE_RESERVATION);

  const reservation = (data?.restaurantReservation ?? null) as ReservationDetail | null;

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=/reservations/${reservationId}`);
  }, [authLoading, user, router, reservationId]);

  useEffect(() => {
    if (!reservation?.restaurantId) return;
    setRestaurantId(reservation.restaurantId);
  }, [reservation?.restaurantId, setRestaurantId]);

  const timeZone = restaurantTimeZone(reservation?.restaurant ?? {});
  const name = formatGuestName(reservation?.diner);
  const occasion = formatOccasion(reservation?.occasion);
  const source = formatSource(reservation?.source);
  const tableLabel =
    (reservation?.tables ?? []).map((t) => t.name).join(', ') || 'Unassigned';
  const tableArea = (reservation?.tables ?? [])
    .map((t) => t.floorArea)
    .filter(Boolean)
    .join(', ');

  const listHref = reservation?.restaurantId
    ? `/reservations?restaurant=${reservation.restaurantId}`
    : '/reservations';

  const runStatusUpdate = async (status: string, reason?: string, successMessage?: string) => {
    if (!reservation) return;
    try {
      await updateStatus({ variables: { id: reservation.id, status, reason } });
      message.success(successMessage ?? 'Reservation updated');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = () => {
    if (!reservation) return;
    Modal.confirm({
      title: 'Delete reservation?',
      content: `Remove ${name}'s booking permanently. Active bookings are cancelled first.`,
      okText: 'Delete',
      okButtonProps: { danger: true, loading: deleting },
      onOk: async () => {
        await deleteReservation({ variables: { id: reservation.id } });
        message.success('Reservation deleted');
        router.push(listHref);
      },
    });
  };

  if (authLoading || (loading && !reservation)) {
    return (
      <Card
        styles={{ body: { display: 'grid', placeItems: 'center', minHeight: 280 } }}
        style={{ borderRadius: radii.lg }}
      >
        <Spin size="large" />
      </Card>
    );
  }

  if (!reservation) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Reservation"
          back={
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/reservations')}
              style={{ paddingLeft: 0 }}
            >
              Reservations
            </Button>
          }
        />
        <EmptyState
          icon={<CalendarOutlined />}
          title="Reservation not found"
          description="This booking may have been removed, or you may not have access to it."
          action={
            <Button type="primary" onClick={() => router.push(listHref)}>
              Back to reservations
            </Button>
          }
        />
      </Space>
    );
  }

  const canEdit = ['pending', 'confirmed', 'seated'].includes(reservation.status);
  const whenLabel = formatUsDateTime(reservation.slotStart, {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = reservation.slotEnd
    ? `${formatTimeInTimeZone(reservation.slotStart, timeZone)} – ${formatTimeInTimeZone(reservation.slotEnd, timeZone)}`
    : formatTimeInTimeZone(reservation.slotStart, timeZone);

  const extras = [
    reservation.experienceTitle
      ? {
          label: 'Experience',
          value: [
            reservation.experienceTitle,
            reservation.experienceTicketQty ? `× ${reservation.experienceTicketQty}` : null,
            formatUsd(reservation.experiencePriceCents),
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
    reservation.packageTitle
      ? {
          label: 'Package',
          value: [reservation.packageTitle, formatUsd(reservation.packagePriceCents)]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
    reservation.privateDiningSpaceName
      ? {
          label: 'Private dining',
          value: [reservation.privateDiningSpaceName, formatUsd(reservation.privateDiningPriceCents)]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
    reservation.depositAmountCents
      ? {
          label: 'Deposit',
          value: [formatUsd(reservation.depositAmountCents), formatDepositStatus(reservation.depositStatus)]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div component="ReservationDetailPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title={name}
          subtitle={reservation.restaurant?.name ? `${reservation.restaurant.name} · ${whenLabel}` : whenLabel}
          back={
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(listHref)}
              style={{ paddingLeft: 0 }}
            >
              Reservations
            </Button>
          }
          extra={<StatusTag status={reservation.status} />}
        />

        <Card
          style={{
            borderRadius: radii.lg,
            overflow: 'hidden',
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              padding: '28px 28px 24px',
              background: `linear-gradient(180deg, ${colors.brand[50]} 0%, ${colors.surface} 72%)`,
            }}
          >
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: colors.brand[600],
                  color: colors.textInverse,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: 0.4,
                  flexShrink: 0,
                  boxShadow: shadows.brand,
                }}
              >
                {guestInitials(name)}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Title level={3} style={{ margin: 0, letterSpacing: typography.letterSpacing.tight }}>
                  {name}
                </Title>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {reservation.diner?.phone ? (
                    <Text type="secondary">
                      <PhoneOutlined style={{ marginRight: 6 }} />
                      <a href={`tel:${reservation.diner.phone}`} style={{ color: 'inherit' }}>
                        {reservation.diner.phone}
                      </a>
                    </Text>
                  ) : null}
                  {reservation.diner?.email ? (
                    <Text type="secondary">
                      <MailOutlined style={{ marginRight: 6 }} />
                      <a href={`mailto:${reservation.diner.email}`} style={{ color: 'inherit' }}>
                        {reservation.diner.email}
                      </a>
                    </Text>
                  ) : null}
                </div>
                <Title level={4} style={{ margin: '14px 0 0', fontWeight: typography.fontWeight.semibold }}>
                  {timeLabel}
                </Title>
                <Text type="secondary">{whenLabel}</Text>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              <MetaChip label="Guests" value={String(reservation.partySize)} />
              <MetaChip label="Table" value={tableLabel} />
              <MetaChip label="Source" value={source ?? '—'} />
              <MetaChip label="Occasion" value={occasion ?? 'None'} />
            </div>
          </div>

          <div style={{ padding: '8px 28px 22px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {reservation.status === 'pending' ? (
              <Button type="primary" loading={updatingStatus} onClick={() => runStatusUpdate('confirmed')}>
                Confirm
              </Button>
            ) : null}
            {reservation.status === 'confirmed' ? (
              <Button type="primary" loading={updatingStatus} onClick={() => runStatusUpdate('seated')}>
                Seat
              </Button>
            ) : null}
            {reservation.status === 'seated' ? (
              <Button
                type="primary"
                loading={updatingStatus}
                onClick={() =>
                  runStatusUpdate('completed', undefined, 'Marked completed — loyalty points awarded')
                }
              >
                Complete
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  router.push(
                    `/reservations?reservationId=${reservation.id}&edit=1&restaurant=${reservation.restaurantId}`,
                  )
                }
              >
                Edit
              </Button>
            ) : null}
            <Button
              icon={<MessageOutlined />}
              onClick={() => router.push(`/messages?reservationId=${reservation.id}`)}
            >
              Message guest
            </Button>
            {reservation.status === 'confirmed' ? (
              <Button loading={updatingStatus} onClick={() => runStatusUpdate('no_show')}>
                No-show
              </Button>
            ) : null}
            {['pending', 'confirmed'].includes(reservation.status) ? (
              <Button
                danger
                loading={updatingStatus}
                onClick={() => runStatusUpdate('cancelled', 'Cancelled by restaurant')}
              >
                Cancel
              </Button>
            ) : null}
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="Guest"
              style={{ borderRadius: radii.lg, height: '100%', border: `1px solid ${colors.bordersubtle}` }}
            >
              <InfoRow label="Name">
                <Text strong>
                  <UserOutlined style={{ marginRight: 8, color: colors.textTertiary }} />
                  {name}
                </Text>
              </InfoRow>
              <InfoRow label="Phone">
                {reservation.diner?.phone ? (
                  <a href={`tel:${reservation.diner.phone}`}>{reservation.diner.phone}</a>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </InfoRow>
              <InfoRow label="Email">
                {reservation.diner?.email ? (
                  <a href={`mailto:${reservation.diner.email}`}>{reservation.diner.email}</a>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </InfoRow>
              <div style={{ paddingTop: 16 }}>
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  onClick={() => router.push(`/messages?reservationId=${reservation.id}`)}
                >
                  Message guest
                </Button>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="Visit"
              style={{ borderRadius: radii.lg, height: '100%', border: `1px solid ${colors.bordersubtle}` }}
            >
              <InfoRow label="When">
                <Text>
                  <CalendarOutlined style={{ marginRight: 8, color: colors.textTertiary }} />
                  {whenLabel}
                  <Text type="secondary"> · {timeLabel}</Text>
                </Text>
              </InfoRow>
              <InfoRow label="Party">
                <Text>
                  <TeamOutlined style={{ marginRight: 8, color: colors.textTertiary }} />
                  {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                </Text>
              </InfoRow>
              <InfoRow label="Table">
                <Text>
                  <EnvironmentOutlined style={{ marginRight: 8, color: colors.textTertiary }} />
                  {tableLabel}
                  {tableArea ? <Text type="secondary"> · {tableArea}</Text> : null}
                </Text>
              </InfoRow>
              <InfoRow label="Special request">
                {reservation.guestNotes?.trim() ? (
                  <Text>{reservation.guestNotes}</Text>
                ) : (
                  <Text type="secondary">None</Text>
                )}
              </InfoRow>
              {extras.map((item) => (
                <InfoRow key={item.label} label={item.label}>
                  <Text>{item.value}</Text>
                </InfoRow>
              ))}
              <InfoRow label="Booked">
                <Text type="secondary">
                  {reservation.createdAt
                    ? formatUsDateTime(reservation.createdAt, {
                        timeZone,
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '—'}
                </Text>
              </InfoRow>
              {reservation.seatedAt ? (
                <InfoRow label="Seated">
                  <Text type="secondary">
                    {formatUsDateTime(reservation.seatedAt, {
                      timeZone,
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </InfoRow>
              ) : null}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default function ReservationDetailPage() {
  return (
    <div component="ReservationDetailPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <ReservationDetailPageContent />
      </Suspense>
    </div>
  );
}
