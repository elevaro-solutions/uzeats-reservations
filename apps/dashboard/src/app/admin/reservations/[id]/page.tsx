'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  TimePicker,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  RollbackOutlined,
  TeamOutlined,
  UserDeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  OCCASION_LABELS,
  OCCASIONS,
  formatTimeInTimeZone,
  formatUsDateTime,
  restaurantTimeZone,
} from '@reservations/shared';
import {
  EmptyState,
  PageHeader,
  StatusTag,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from '@reservations/ui';
import {
  AVAILABILITY,
  DELETE_RESERVATION,
  REFUND_RESERVATION_DEPOSIT,
  RESTAURANT_RESERVATION,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import {
  canRefundDeposit,
  formatDepositStatus,
  formatOccasion,
  formatSource,
  formatUsd,
  guestInitials,
  guestName as formatGuestName,
} from '@/lib/reservationFormat';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useFormDirty } from '@/lib/useFormDirty';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { RefundDepositModal } from '@/components/RefundDepositModal';

const { Text, Title } = Typography;

const OCCASION_OPTIONS = OCCASIONS.map((value) => ({
  value,
  label: OCCASION_LABELS[value],
}));

const EDITABLE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

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
  depositRefundedCents?: number | null;
  depositRefundableCents?: number | null;
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

function combineDateTime(date: Dayjs, time: Dayjs) {
  return date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0);
}

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

function AdminReservationDetailContent() {
  const { ready } = useRequireAdmin();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = params.id;
  const openEditOnLoad = searchParams.get('edit') === '1';

  const { data, loading, refetch } = useQuery(RESTAURANT_RESERVATION, {
    skip: !ready || !reservationId,
    variables: { id: reservationId },
  });
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [updateReservation, { loading: updating }] = useMutation(UPDATE_RESERVATION);
  const [deleteReservation, { loading: deleting }] = useMutation(DELETE_RESERVATION);
  const [refundDeposit, { loading: refunding }] = useMutation(REFUND_RESERVATION_DEPOSIT);

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [editForm] = Form.useForm();
  const editDirty = useFormDirty();
  const editDate = Form.useWatch('date', editForm) as Dayjs | undefined;
  const editPartySize = Form.useWatch('partySize', editForm) as number | undefined;
  const openedEditForId = useRef<string | null>(null);

  const reservation = (data?.restaurantReservation ?? null) as ReservationDetail | null;

  const { data: slotsData } = useQuery(AVAILABILITY, {
    skip: !editOpen || !reservation?.restaurantId || !editDate || !editPartySize,
    variables: {
      restaurantId: reservation?.restaurantId,
      date: editDate?.format('YYYY-MM-DD'),
      partySize: editPartySize ?? 2,
    },
  });

  const openEdit = (r: ReservationDetail) => {
    const slot = dayjs(r.slotStart);
    editForm.setFieldsValue({
      date: slot,
      time: slot,
      partySize: r.partySize,
      occasion: r.occasion ?? 'none',
      guestNotes: r.guestNotes ?? '',
      slotTime: r.slotStart,
    });
    editDirty.clearDirty();
    setEditOpen(true);
  };

  useEffect(() => {
    if (!reservation || !openEditOnLoad) return;
    if (!EDITABLE_STATUSES.has(reservation.status)) return;
    if (openedEditForId.current === reservation.id) return;
    openedEditForId.current = reservation.id;
    openEdit(reservation);
    router.replace(`/admin/reservations/${reservation.id}`, { scroll: false });
  }, [reservation, openEditOnLoad, router, editForm]);

  if (!ready) return null;

  const listHref = '/admin/reservations';
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

  const runStatusUpdate = async (status: string, reason?: string, successMessage?: string) => {
    if (!reservation) return false;
    try {
      await updateStatus({ variables: { id: reservation.id, status, reason } });
      message.success(successMessage ?? 'Reservation updated');
      refetch();
      return true;
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
      return false;
    }
  };

  const handleEdit = async () => {
    if (!reservation || !editDirty.dirty) return;
    try {
      const values = await editForm.validateFields();
      const slotStart = values.slotTime
        ? values.slotTime
        : combineDateTime(values.date, values.time).toISOString();
      await updateReservation({
        variables: {
          id: reservation.id,
          input: {
            partySize: values.partySize,
            slotStart,
            occasion: values.occasion,
            guestNotes: values.guestNotes ?? '',
          },
        },
      });
      message.success('Reservation updated');
      editDirty.clearDirty();
      setEditOpen(false);
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update reservation');
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

  const handleRefundDeposit = () => {
    if (!reservation || !canRefundDeposit(reservation)) return;
    setRefundOpen(true);
  };

  if (loading && !reservation) {
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
              onClick={() => router.push(listHref)}
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

  const canEdit = EDITABLE_STATUSES.has(reservation.status);

  const moreItems: NonNullable<MenuProps['items']> = [];
  if (reservation.status === 'confirmed' || reservation.status === 'seated') {
    moreItems.push({
      key: 'no_show',
      icon: <UserDeleteOutlined />,
      label: 'No-show',
      disabled: updatingStatus,
      onClick: () => runStatusUpdate('no_show'),
    });
  }
  if (['pending', 'confirmed'].includes(reservation.status)) {
    moreItems.push({
      key: 'cancel',
      icon: <CloseCircleOutlined />,
      label: 'Cancel',
      danger: true,
      disabled: updatingStatus,
      onClick: () => setCancelOpen(true),
    });
  }
  if (canRefundDeposit(reservation)) {
    moreItems.push({
      key: 'refund_deposit',
      icon: <RollbackOutlined />,
      label: reservation.depositStatus === 'authorized' ? 'Release deposit' : 'Refund deposit',
      danger: true,
      disabled: refunding,
      onClick: handleRefundDeposit,
    });
  }
  if (moreItems.length > 0) {
    moreItems.push({ type: 'divider' });
  }
  moreItems.push({
    key: 'delete',
    icon: <DeleteOutlined />,
    label: 'Delete',
    danger: true,
    onClick: handleDelete,
  });

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
          value: [
            formatUsd(reservation.depositAmountCents),
            formatDepositStatus(reservation.depositStatus, {
              depositAmountCents: reservation.depositAmountCents,
              depositRefundedCents: reservation.depositRefundedCents,
            }),
            (reservation.depositRefundedCents ?? 0) > 0
              ? `${formatUsd(reservation.depositRefundedCents)} refunded`
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const slotOptions = (slotsData?.availability ?? [])
    .filter(
      (s: { time: string; available: boolean }) =>
        s.available || s.time === reservation.slotStart,
    )
    .map((s: { time: string }) => ({
      value: s.time,
      label: dayjs(s.time).format('h:mm A'),
    }));

  return (
    <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title={name}
        subtitle={
          reservation.restaurant?.name ? `${reservation.restaurant.name} · ${whenLabel}` : whenLabel
        }
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
              <Title
                level={4}
                style={{ margin: '14px 0 0', fontWeight: typography.fontWeight.semibold }}
              >
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
            {(reservation.depositAmountCents ?? 0) > 0 ? (
              <MetaChip
                label="Deposit"
                value={[
                  formatUsd(reservation.depositAmountCents),
                  formatDepositStatus(reservation.depositStatus, {
                    depositAmountCents: reservation.depositAmountCents,
                    depositRefundedCents: reservation.depositRefundedCents,
                  }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: '8px 28px 22px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
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
          {canRefundDeposit(reservation) ? (
            <Button
              danger
              icon={<RollbackOutlined />}
              loading={refunding}
              onClick={handleRefundDeposit}
            >
              {reservation.depositStatus === 'authorized' ? 'Release deposit' : 'Refund deposit'}
            </Button>
          ) : null}
          {canEdit ? (
            <Button icon={<EditOutlined />} onClick={() => openEdit(reservation)}>
              Change date &amp; time
            </Button>
          ) : null}
          <Dropdown menu={{ items: moreItems }} trigger={['click']}>
            <Button icon={<MoreOutlined />}>More actions</Button>
          </Dropdown>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Guest"
            style={{
              borderRadius: radii.lg,
              height: '100%',
              border: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <InfoRow label="Name">
              <Text strong>
                <UserOutlined style={{ marginRight: 8, color: colors.textTertiary }} />
                {reservation.diner?.id ? (
                  <Link href={`/admin/diners/${reservation.diner.id}`}>{name}</Link>
                ) : (
                  name
                )}
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
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Visit"
            style={{
              borderRadius: radii.lg,
              height: '100%',
              border: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <InfoRow label="Restaurant">
              <Link href={`/admin/restaurants/${reservation.restaurantId}?tab=reservations`}>
                {reservation.restaurant?.name || reservation.restaurantId}
              </Link>
            </InfoRow>
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

      <Modal
        title="Change date & time"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          editDirty.clearDirty();
        }}
        onOk={() => void handleEdit()}
        confirmLoading={updating}
        okText="Save changes"
        okButtonProps={{ disabled: !editDirty.dirty }}
        width={560}
        centered
        destroyOnClose
        styles={{ body: { paddingTop: 4 } }}
      >
        <Form form={editForm} layout="vertical" onValuesChange={editDirty.onValuesChange}>
          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]} required>
                <DatePicker
                  style={{ width: '100%' }}
                  onChange={() => {
                    editForm.setFieldsValue({ slotTime: undefined });
                    editDirty.markDirty();
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="time" label="Time" rules={[{ required: true }]} required>
                <TimePicker
                  format="h:mm A"
                  minuteStep={15}
                  use12Hours
                  style={{ width: '100%' }}
                  onChange={() => {
                    editForm.setFieldsValue({ slotTime: undefined });
                    editDirty.markDirty();
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="partySize" label="Guests" rules={[{ required: true }]} required>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="slotTime" hidden>
            <Input />
          </Form.Item>

          {slotOptions.length > 0 ? (
            <Form.Item
              label="Open slots"
              extra="Quick-fill date and time from an available slot"
              style={{ marginBottom: 20 }}
            >
              <Select
                placeholder="Choose a slot"
                options={slotOptions}
                value={editForm.getFieldValue('slotTime')}
                onChange={(iso: string) => {
                  const slot = dayjs(iso);
                  editForm.setFieldsValue({ date: slot, time: slot, slotTime: iso });
                  editDirty.markDirty();
                }}
                allowClear
              />
            </Form.Item>
          ) : null}

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="occasion" label="Occasion">
                <Select options={OCCASION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="guestNotes" label="Special requests">
                <Input.TextArea rows={2} maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <CancelReservationModal
        open={cancelOpen}
        guestName={name}
        loading={updatingStatus}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          const ok = await runStatusUpdate('cancelled', reason, 'Reservation cancelled');
          if (ok) setCancelOpen(false);
        }}
      />

      <RefundDepositModal
        open={refundOpen}
        isHold={reservation.depositStatus === 'authorized'}
        guestName={name}
        amountLabel={formatUsd(reservation.depositAmountCents)}
        maxRefundableCents={
          reservation.depositRefundableCents ??
          Math.max(
            0,
            (reservation.depositAmountCents ?? 0) - (reservation.depositRefundedCents ?? 0),
          )
        }
        loading={refunding}
        onClose={() => setRefundOpen(false)}
        onConfirm={async (reason, amountCents) => {
          const isHold = reservation.depositStatus === 'authorized';
          const remaining =
            reservation.depositRefundableCents ??
            Math.max(
              0,
              (reservation.depositAmountCents ?? 0) - (reservation.depositRefundedCents ?? 0),
            );
          await refundDeposit({ variables: { id: reservation.id, reason, amountCents } });
          message.success(
            isHold
              ? 'Deposit hold released'
              : amountCents != null && amountCents < remaining
                ? 'Partial deposit refunded'
                : 'Deposit refunded',
          );
          setRefundOpen(false);
          await refetch();
        }}
      />
    </Space>
  );
}

export default function AdminReservationDetailPage() {
  return (
    <Suspense>
      <AdminReservationDetailContent />
    </Suspense>
  );
}
