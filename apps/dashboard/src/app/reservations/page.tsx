'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LoginOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  RollbackOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  addCalendarDays,
  formatTimeInTimeZone,
  formatUsDateTime,
  hmInTimeZone,
  isPastCalendarDay,
  isoDateInTimeZone,
  restaurantTimeZone,
  todayIsoInTimeZone,
  zonedWallClockToUtc,
} from '@reservations/shared';
import {
  PageHeader,
  PhoneInput,
  StatusTag,
  colors,
  radii,
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  AVAILABILITY,
  CREATE_OWNER_RESERVATION,
  DELETE_RESERVATION,
  EXPORT_RESTAURANT_RESERVATIONS,
  MY_RESTAURANTS,
  REFUND_RESERVATION_DEPOSIT,
  RESTAURANT_RESERVATION,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { useUrlPagination } from '@/lib/useUrlPagination';
import {
  canRefundDeposit,
  formatDepositStatus,
  formatOccasion,
  formatSource,
  formatUsd,
  guestName as formatGuestName,
} from '@/lib/reservationFormat';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { RefundDepositModal } from '@/components/RefundDepositModal';
import { ExportMenu, type ListExportFormat } from '@/components/ExportMenu';
import { downloadExportPayload } from '@/lib/downloadExport';
import {
  ALL_LOCATIONS_VALUE,
  buildRestaurantSelectOptions,
  restaurantSelectFilterOption,
} from '@/lib/restaurants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const LOCATIONS_PARAM = 'locations';

const OCCASION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'business', label: 'Business' },
  { value: 'date', label: 'Date' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'other', label: 'Other' },
];

const DATE_PERIODS = [
  'today',
  'yesterday',
  'tomorrow',
  'this_week',
  'last_week',
  'this_month',
  'upcoming',
  'past',
  'all',
  'custom',
] as const;

type DatePeriod = (typeof DATE_PERIODS)[number];

const DATE_PERIOD_OPTIONS: { value: DatePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All dates' },
  { value: 'custom', label: 'Custom range' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'seated', label: 'Seated' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

const SINGLE_DAY_PERIODS = new Set<DatePeriod>(['today', 'yesterday', 'tomorrow']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseListDate(value: string | null | undefined, fallback: string) {
  return value && ISO_DATE.test(value) ? value : fallback;
}

type ReservationRow = {
  id: string;
  restaurantId?: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string;
  occasion?: string;
  guestNotes?: string;
  source?: string;
  tableIds?: string[];
  depositAmountCents?: number;
  depositRefundedCents?: number;
  depositRefundableCents?: number;
  depositStatus?: string;
  experienceTitle?: string;
  experiencePriceCents?: number;
  experienceTicketQty?: number;
  packageTitle?: string;
  packagePriceCents?: number;
  privateDiningSpaceName?: string;
  privateDiningPriceCents?: number;
  createdAt?: string;
  diner?: { id?: string; firstName?: string; lastName?: string; phone?: string; email?: string };
  tables?: { id: string; name: string }[];
  restaurant?: { id: string; name: string } | null;
};

type TableOption = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
};

function isDatePeriod(value: string | null): value is DatePeriod {
  return !!value && (DATE_PERIODS as readonly string[]).includes(value);
}

function guestName(r: ReservationRow) {
  return formatGuestName(r.diner);
}

function wallClockToIso(date: Dayjs, time: Dayjs, timeZone: string): string {
  const hm = `${String(time.hour()).padStart(2, '0')}:${String(time.minute()).padStart(2, '0')}`;
  return zonedWallClockToUtc(date.format('YYYY-MM-DD'), hm, timeZone).toISOString();
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div component="SectionLabel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '2px 0 14px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: colors.textTertiary,
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: colors.bordersubtle }} />
    </div>
  );
}

function ReservationsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reservationIdParam = searchParams.get('reservationId');
  const editParam = searchParams.get('edit') === '1';
  const openedReservationIdRef = useRef<string | null>(null);
  const period: DatePeriod = isDatePeriod(searchParams.get('period'))
    ? (searchParams.get('period') as DatePeriod)
    : 'upcoming';
  const rawStatus = searchParams.get('status');
  const statusFilter = STATUS_FILTER_OPTIONS.some((o) => o.value === rawStatus)
    ? rawStatus!
    : undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ReservationRow | null>(null);
  const [cancelFor, setCancelFor] = useState<ReservationRow | null>(null);
  const [refundFor, setRefundFor] = useState<ReservationRow | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });

  const createPartySize = Form.useWatch('partySize', createForm) ?? 2;
  const createDate = Form.useWatch('date', createForm);
  const editPartySize = Form.useWatch('partySize', editForm) ?? 2;
  const editDate = Form.useWatch('date', editForm);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, setRestaurantId } = usePartnerRestaurant(restaurants);
  const canShowAllLocations = restaurants.length > 1;
  const allLocations =
    canShowAllLocations && searchParams.get(LOCATIONS_PARAM) === ALL_LOCATIONS_VALUE;
  const restaurantFilterOptions = useMemo(
    () =>
      buildRestaurantSelectOptions(restaurants, {
        includeAllLocations: canShowAllLocations,
      }),
    [restaurants, canShowAllLocations],
  );

  const activeRestaurant = useMemo(
    () =>
      allLocations
        ? undefined
        : restaurants.find((r: { id: string }) => r.id === activeRestaurantId),
    [restaurants, activeRestaurantId, allLocations],
  );

  const tables: TableOption[] = useMemo(
    () =>
      ((activeRestaurant?.tables ?? []) as TableOption[]).filter((t) => t.active !== false),
    [activeRestaurant],
  );
  const timeZone = useMemo(
    () => restaurantTimeZone(activeRestaurant ?? {}),
    [activeRestaurant],
  );

  const todayIso = todayIsoInTimeZone(timeZone);
  const legacyCustomDate = searchParams.get('date');
  const customStartDate = parseListDate(
    searchParams.get('startDate') ?? legacyCustomDate,
    todayIso,
  );
  const customEndDate = parseListDate(
    searchParams.get('endDate') ?? legacyCustomDate,
    customStartDate,
  );
  const customRangeSingleDay = customStartDate === customEndDate;
  const showTimeOnlyColumn =
    SINGLE_DAY_PERIODS.has(period) || (period === 'custom' && customRangeSingleDay);

  const replaceListParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if ((params.get('period') ?? 'upcoming') === 'upcoming') params.delete('period');
      if (params.get('period') !== 'custom') {
        params.delete('date');
        params.delete('startDate');
        params.delete('endDate');
      } else {
        params.delete('date');
      }
      if (resetPage) params.delete('page');
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      if (nextUrl === currentUrl) return;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onRestaurantFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      if ((params.get('period') ?? 'upcoming') === 'upcoming') params.delete('period');
      if (params.get('period') !== 'custom') {
        params.delete('date');
        params.delete('startDate');
        params.delete('endDate');
      } else {
        params.delete('date');
      }

      if (value === ALL_LOCATIONS_VALUE) {
        params.set(LOCATIONS_PARAM, ALL_LOCATIONS_VALUE);
      } else {
        params.delete(LOCATIONS_PARAM);
        if (restaurants.length > 1) params.set('restaurant', value);
        else params.delete('restaurant');
        localStorage.setItem('activeRestaurantId', value);
        window.dispatchEvent(new CustomEvent('rt-restaurant-change', { detail: value }));
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, restaurants.length, router, searchParams],
  );

  const queryStartDate = period === 'custom' ? customStartDate : undefined;
  const queryEndDate = period === 'custom' ? customEndDate : undefined;
  const queryPeriod = period === 'custom' ? undefined : period;
  const queryRestaurantId = allLocations ? undefined : activeRestaurantId;
  const listReady = allLocations ? restaurants.length > 0 : Boolean(activeRestaurantId);

  const { data, refetch, loading } = useQuery(RESTAURANT_RESERVATIONS, {
    skip: !listReady,
    variables: {
      restaurantId: queryRestaurantId,
      startDate: queryStartDate,
      endDate: queryEndDate,
      period: queryPeriod,
      status: statusFilter,
      limit,
      offset,
    },
  });

  const listItems = (data?.restaurantReservations?.items ?? []) as ReservationRow[];
  const reservationInList = useMemo(
    () => (reservationIdParam ? listItems.find((r) => r.id === reservationIdParam) : undefined),
    [listItems, reservationIdParam],
  );

  const {
    data: lookupData,
    loading: lookupLoading,
    error: lookupError,
  } = useQuery(RESTAURANT_RESERVATION, {
    skip: !reservationIdParam || !editParam,
    variables: { id: reservationIdParam },
  });

  const lookedUpReservation = (lookupData?.restaurantReservation ?? undefined) as
    | ReservationRow
    | undefined;
  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [createReservation, { loading: creating }] = useMutation(CREATE_OWNER_RESERVATION);
  const [updateReservation, { loading: updating }] = useMutation(UPDATE_RESERVATION);
  const [deleteReservation, { loading: deleting }] = useMutation(DELETE_RESERVATION);
  const [refundDeposit, { loading: refunding }] = useMutation(REFUND_RESERVATION_DEPOSIT);
  const [exportReservations, { loading: exporting }] = useMutation(EXPORT_RESTAURANT_RESERVATIONS);

  const createDateStr = (createDate as Dayjs | undefined)?.format('YYYY-MM-DD');
  const editDateStr = (editDate as Dayjs | undefined)?.format('YYYY-MM-DD');

  const { data: createSlotsData } = useQuery(AVAILABILITY, {
    skip: !activeRestaurantId || !createOpen || !createDateStr,
    variables: {
      restaurantId: activeRestaurantId,
      date: createDateStr,
      partySize: createPartySize,
    },
  });

  const { data: editSlotsData } = useQuery(AVAILABILITY, {
    skip: !activeRestaurantId || !editing || !editDateStr,
    variables: {
      restaurantId: activeRestaurantId,
      date: editDateStr,
      partySize: editPartySize,
    },
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const tableOptionsForParty = (partySize: number, includeId?: string) =>
    tables
      .filter(
        (t) =>
          t.id === includeId ||
          (t.minCapacity <= partySize && t.maxCapacity >= partySize),
      )
      .map((t) => ({
        value: t.id,
        label: `${t.name} (${t.minCapacity}–${t.maxCapacity})`,
      }));

  const slotOptions = (
    slots: { time: string; available: boolean }[] | undefined,
    currentSlot?: string,
  ) =>
    (slots ?? [])
      .filter((s) => s.available || s.time === currentSlot)
      .map((s) => ({
        value: s.time,
        label: formatTimeInTimeZone(s.time, timeZone),
      }));

  const openCreate = () => {
    const today = dayjs(todayIso);
    const defaultDate =
      period === 'custom'
        ? dayjs(customStartDate)
        : period === 'tomorrow'
          ? dayjs(addCalendarDays(todayIso, 1))
          : today;
    createForm.setFieldsValue({
      date: defaultDate.format('YYYY-MM-DD') < todayIso ? today : defaultDate,
      time: dayjs().hour(19).minute(0),
      partySize: 2,
      source: 'phone',
      occasion: 'none',
      seatImmediately: false,
      guestNotes: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      tableId: undefined,
    });
    setCreateOpen(true);
  };

  const openView = (r: ReservationRow) => {
    router.push(`/reservations/${r.id}`);
  };

  const openEdit = (r: ReservationRow) => {
    const dateIso = isoDateInTimeZone(new Date(r.slotStart), timeZone);
    const hm = hmInTimeZone(new Date(r.slotStart), timeZone);
    const [hour, minute] = hm.split(':').map(Number);
    setEditing(r);
    editForm.setFieldsValue({
      date: dayjs(dateIso),
      time: dayjs().hour(hour ?? 0).minute(minute ?? 0),
      partySize: r.partySize,
      occasion: r.occasion ?? 'none',
      guestNotes: r.guestNotes ?? '',
      tableId: r.tables?.[0]?.id ?? r.tableIds?.[0],
      slotTime: r.slotStart,
    });
  };

  useEffect(() => {
    if (!reservationIdParam) {
      openedReservationIdRef.current = null;
      return;
    }
    if (!editParam) {
      router.replace(`/reservations/${reservationIdParam}`);
    }
  }, [reservationIdParam, editParam, router]);

  useEffect(() => {
    if (!reservationIdParam || !editParam || openedReservationIdRef.current === reservationIdParam) return;

    const reservation = reservationInList ?? lookedUpReservation;
    if (!reservation) {
      if (lookupLoading) return;
      if (lookupError || lookupData) {
        message.warning('Reservation not found');
        openedReservationIdRef.current = reservationIdParam;
        replaceListParams({ reservationId: undefined, edit: undefined }, false);
      }
      return;
    }

    if (reservation.restaurantId && reservation.restaurantId !== activeRestaurantId) {
      const known = restaurants.some((r: { id: string }) => r.id === reservation.restaurantId);
      if (!known) {
        if (restaurants.length === 0) return;
        message.warning('Reservation not found');
        openedReservationIdRef.current = reservationIdParam;
        replaceListParams({ reservationId: undefined, edit: undefined }, false);
        return;
      }
      setRestaurantId(reservation.restaurantId);
      return;
    }

    openEdit(reservation);
    openedReservationIdRef.current = reservationIdParam;
    replaceListParams({ reservationId: undefined, edit: undefined }, false);
  }, [
    reservationIdParam,
    reservationInList,
    lookedUpReservation,
    lookupLoading,
    lookupError,
    lookupData,
    activeRestaurantId,
    restaurants,
    setRestaurantId,
    editParam,
    replaceListParams,
  ]);

  const runStatusUpdate = async (
    id: string,
    status: string,
    reason?: string,
    successMessage?: string,
  ) => {
    try {
      await updateStatus({ variables: { id, status, reason } });
      if (successMessage) message.success(successMessage);
      refetch();
      return true;
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
      return false;
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const slotStart = wallClockToIso(values.date, values.time, timeZone);
      await createReservation({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            partySize: values.partySize,
            slotStart,
            occasion: values.occasion,
            guestNotes: values.guestNotes || undefined,
            source: values.source,
            seatImmediately: values.seatImmediately,
            tableId: values.tableId || undefined,
            guest: {
              firstName: values.firstName,
              lastName: values.lastName || '',
              phone: values.phone || undefined,
              email: values.email || undefined,
            },
          },
        },
      });
      message.success('Reservation created');
      setCreateOpen(false);
      createForm.resetFields();
      const createdDate = (values.date as Dayjs).format('YYYY-MM-DD');
      replaceListParams({
        period: 'custom',
        startDate: createdDate,
        endDate: createdDate,
        status: undefined,
      });
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to create reservation');
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    try {
      const values = await editForm.validateFields();
      const slotStart = values.slotTime
        ? values.slotTime
        : wallClockToIso(values.date, values.time, timeZone);
      await updateReservation({
        variables: {
          id: editing.id,
          input: {
            partySize: values.partySize,
            slotStart,
            occasion: values.occasion,
            guestNotes: values.guestNotes ?? '',
            tableId: values.tableId || undefined,
          },
        },
      });
      message.success('Reservation updated');
      setEditing(null);
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update reservation');
    }
  };

  const onExportReservations = async (format: ListExportFormat) => {
    if (!listReady) return;
    try {
      const res = await exportReservations({
        variables: {
          restaurantId: queryRestaurantId,
          startDate: queryStartDate,
          endDate: queryEndDate,
          period: queryPeriod,
          status: statusFilter,
          format,
        },
      });
      const payload = res.data?.exportRestaurantReservations;
      if (!payload?.content) throw new Error('No export returned');
      downloadExportPayload(payload);
      message.success(
        `Exported ${payload.rowCount} reservations as ${format === 'xlsx' ? 'Excel' : format.toUpperCase()}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleDelete = (r: ReservationRow) => {
    Modal.confirm({
      title: 'Delete reservation?',
      content: `Remove ${r.diner?.firstName ?? 'this guest'}'s booking permanently. Active bookings are cancelled first.`,
      okText: 'Delete',
      okButtonProps: { danger: true, loading: deleting },
      onOk: async () => {
        try {
          await deleteReservation({ variables: { id: r.id } });
          message.success('Reservation deleted');
          refetch();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Failed to delete');
          throw err;
        }
      },
    });
  };

  const actionItems = (r: ReservationRow): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View details',
        onClick: () => openView(r),
      },
      { type: 'divider' },
    ];

    if (['pending', 'confirmed', 'seated'].includes(r.status)) {
      items.push({
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => openEdit(r),
      });
    }

    if (r.status === 'pending') {
      items.push({
        key: 'confirm',
        icon: <CheckCircleOutlined />,
        label: 'Confirm',
        onClick: () => runStatusUpdate(r.id, 'confirmed'),
      });
    }

    if (r.status === 'confirmed') {
      items.push({
        key: 'seat',
        icon: <LoginOutlined />,
        label: 'Seat',
        onClick: () => runStatusUpdate(r.id, 'seated'),
      });
      items.push({
        key: 'no_show',
        icon: <UserDeleteOutlined />,
        label: 'No-show',
        onClick: () => runStatusUpdate(r.id, 'no_show'),
      });
    }

    if (r.status === 'seated') {
      items.push({
        key: 'complete',
        icon: <CheckCircleOutlined />,
        label: 'Complete',
        onClick: () =>
          runStatusUpdate(
            r.id,
            'completed',
            undefined,
            'Marked completed — loyalty points awarded',
          ),
      });
    }

    if (['pending', 'confirmed'].includes(r.status)) {
      items.push({
        key: 'cancel',
        icon: <CloseCircleOutlined />,
        label: 'Cancel',
        danger: true,
        onClick: () => setCancelFor(r),
      });
    }

    if (canRefundDeposit(r)) {
      items.push({
        key: 'refund_deposit',
        icon: <RollbackOutlined />,
        label: r.depositStatus === 'authorized' ? 'Release deposit' : 'Refund deposit',
        danger: true,
        disabled: refunding,
        onClick: () => setRefundFor(r),
      });
    }

    items.push({
      key: 'message',
      icon: <MessageOutlined />,
      label: 'Message guest',
      onClick: () => router.push(`/messages?reservationId=${r.id}`),
    });

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(r),
    });

    return items;
  };

  return (
    <div component="ReservationsPageContent" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Reservations"
        subtitle="Create, edit, and manage covers for your restaurant"
        extra={
          <Space wrap>
            <Select
              style={{ width: 260 }}
              showSearch
              optionFilterProp="label"
              filterOption={restaurantSelectFilterOption}
              options={restaurantFilterOptions}
              value={allLocations ? ALL_LOCATIONS_VALUE : activeRestaurantId}
              onChange={onRestaurantFilterChange}
              placeholder="Restaurant"
              aria-label="Restaurant"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              disabled={!activeRestaurantId || allLocations}
            >
              New reservation
            </Button>
          </Space>
        }
      />
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.sm,
            alignItems: 'center',
            padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`,
          }}
        >
          <Select
            aria-label="Date period"
            value={period}
            style={{ width: 160 }}
            options={DATE_PERIOD_OPTIONS}
            onChange={(value: DatePeriod) => {
              replaceListParams({
                period: value,
                startDate: value === 'custom' ? customStartDate : undefined,
                endDate: value === 'custom' ? customEndDate : undefined,
              });
            }}
          />
          {period === 'custom' ? (
            <RangePicker
              aria-label="Custom date range"
              value={[dayjs(customStartDate), dayjs(customEndDate)]}
              allowClear={false}
              onChange={(range) => {
                if (!range?.[0] || !range[1]) return;
                replaceListParams({
                  period: 'custom',
                  startDate: range[0].format('YYYY-MM-DD'),
                  endDate: range[1].format('YYYY-MM-DD'),
                });
              }}
            />
          ) : null}
          <Select
            aria-label="Reservation status"
            placeholder="All statuses"
            allowClear
            value={statusFilter}
            style={{ width: 160 }}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value: string | undefined) => replaceListParams({ status: value })}
          />
          <ExportMenu
            formats={['xlsx', 'pdf', 'json']}
            loading={exporting}
            disabled={!listReady}
            onExport={(format) => void onExportReservations(format)}
          />
        </div>
        <Table<ReservationRow>
          loading={loading}
          rowKey="id"
          dataSource={(data?.restaurantReservations?.items ?? []) as ReservationRow[]}
          pagination={tablePagination(data?.restaurantReservations?.total ?? 0)}
          scroll={{ x: allLocations ? 1380 : 1260 }}
          onRow={(r) => ({
            onClick: () => openView(r),
            style: { cursor: 'pointer' },
          })}
          columns={[
            ...(allLocations
              ? [
                  {
                    title: 'Location',
                    width: 160,
                    ellipsis: true,
                    render: (_: unknown, r: ReservationRow) =>
                      r.restaurant?.name ?? '—',
                  },
                ]
              : []),
            {
              title: showTimeOnlyColumn ? 'Time' : 'When',
              dataIndex: 'slotStart',
              width: showTimeOnlyColumn ? 90 : 150,
              render: (v: string) =>
                showTimeOnlyColumn
                  ? formatTimeInTimeZone(v, timeZone)
                  : formatUsDateTime(v, {
                      timeZone,
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
            },
            {
              title: 'Guest',
              render: (_: unknown, r) => (
                  <Space orientation="vertical" size={0}>
                    <Text>{guestName(r)}</Text>
                    {r.diner?.phone ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.diner.phone}
                      </Text>
                    ) : null}
                  </Space>
              ),
            },
            { title: 'Party', dataIndex: 'partySize', width: 70 },
            {
              title: 'Table',
              width: 80,
              ellipsis: true,
              render: (_: unknown, r) =>
                (r.tables ?? []).map((t) => t.name).join(', ') || '—',
            },
            {
              title: 'Deposit',
              width: 120,
              render: (_: unknown, r: ReservationRow) => {
                if (!(r.depositAmountCents && r.depositAmountCents > 0)) {
                  return <Text type="secondary">—</Text>;
                }
                return (
                  <Space orientation="vertical" size={0}>
                    <Text>{formatUsd(r.depositAmountCents)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDepositStatus(r.depositStatus, {
                        depositAmountCents: r.depositAmountCents,
                        depositRefundedCents: r.depositRefundedCents,
                      })}
                    </Text>
                  </Space>
                );
              },
            },
            {
              title: 'Source',
              dataIndex: 'source',
              width: 90,
              render: (source?: string) => {
                const label = formatSource(source);
                return label ? <Tag>{label}</Tag> : <Text type="secondary">—</Text>;
              },
            },
            {
              title: 'Occasion',
              dataIndex: 'occasion',
              width: 120,
              render: (occasion: string) => {
                const label = formatOccasion(occasion);
                return label ? <Tag>{label}</Tag> : <Text type="secondary">—</Text>;
              },
            },
            {
              title: 'Special request',
              dataIndex: 'guestNotes',
              ellipsis: true,
              render: (notes: string) =>
                notes?.trim() ? (
                  <Text ellipsis={{ tooltip: notes }}>{notes}</Text>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 110,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Actions',
              width: 108,
              fixed: 'right',
              render: (_: unknown, r) => (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    aria-label="View reservation"
                    onClick={() => openView(r)}
                  />
                  <Dropdown menu={{ items: actionItems(r) }} trigger={['click']} placement="bottomRight">
                    <Button size="small" icon={<MoreOutlined />} aria-label="More actions" />
                  </Dropdown>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="New reservation"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Create reservation"
        width={640}
        wrapClassName="rt-mobile-modal"
        centered
        destroyOnClose
        styles={{ body: { paddingTop: 4, maxHeight: 'min(70vh, 560px)', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        <Form form={createForm} layout="vertical">
          <SectionLabel>When &amp; party</SectionLabel>
          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]} required>
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="time" label="Time" rules={[{ required: true }]} required>
                <TimePicker format="h:mm A" minuteStep={15} use12Hours style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="partySize" label="Guests" rules={[{ required: true }]} required>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {(createSlotsData?.availability ?? []).length > 0 ? (
            <Form.Item
              label="Open slots"
              extra="Quick-fill date and time from an available slot"
              style={{ marginBottom: 20 }}
            >
              <Select
                placeholder="Choose a slot"
                options={slotOptions(createSlotsData?.availability)}
                onChange={(iso: string) => {
                  const dateIso = isoDateInTimeZone(new Date(iso), timeZone);
                  const hm = hmInTimeZone(new Date(iso), timeZone);
                  const [hour, minute] = hm.split(':').map(Number);
                  createForm.setFieldsValue({
                    date: dayjs(dateIso),
                    time: dayjs().hour(hour ?? 0).minute(minute ?? 0),
                  });
                }}
                allowClear
              />
            </Form.Item>
          ) : null}

          <SectionLabel>Guest</SectionLabel>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First name"
                rules={[{ required: true, message: 'First name is required' }]}
                required
              >
                <Input placeholder="Jane" autoComplete="given-name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label="Last name">
                <Input placeholder="Smith" autoComplete="family-name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone" rules={usPhoneRules()}>
                <PhoneInput />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Invalid email' }]}
              >
                <Input placeholder="guest@email.com" type="email" autoComplete="email" />
              </Form.Item>
            </Col>
          </Row>

          <SectionLabel>Details</SectionLabel>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="source" label="Source" rules={[{ required: true }]} required>
                <Select
                  options={[
                    { value: 'phone', label: 'Phone' },
                    { value: 'walkin', label: 'Walk-in' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="occasion" label="Occasion">
                <Select options={OCCASION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="tableId"
                label="Table"
                extra="Leave empty to auto-assign the best available table"
              >
                <Select
                  allowClear
                  placeholder="Auto-assign"
                  options={tableOptionsForParty(createPartySize)}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="guestNotes" label="Special requests">
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  placeholder="Allergies, high chair, window seat…"
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 16px',
              marginTop: 4,
              background: colors.neutral[50],
              borderRadius: radii.md,
              border: `1px solid ${colors.bordersubtle}`,
            }}
          >
            <div>
              <Text strong>Seat immediately</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Skip confirmed status and mark the party as seated now
              </Text>
            </div>
            <Form.Item name="seatImmediately" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Edit reservation"
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={handleEdit}
        confirmLoading={updating}
        okText="Save changes"
        width={600}
        centered
        destroyOnClose
        styles={{ body: { paddingTop: 4 } }}
      >
        <Form form={editForm} layout="vertical">
          <SectionLabel>When &amp; party</SectionLabel>
          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]} required>
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
                  onChange={() => editForm.setFieldsValue({ slotTime: undefined })}
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
                  onChange={() => editForm.setFieldsValue({ slotTime: undefined })}
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

          {(editSlotsData?.availability ?? []).length > 0 ? (
            <Form.Item
              label="Open slots"
              extra="Quick-fill date and time from an available slot"
              style={{ marginBottom: 20 }}
            >
              <Select
                placeholder="Choose a slot"
                options={slotOptions(editSlotsData?.availability, editing?.slotStart)}
                value={editForm.getFieldValue('slotTime')}
                onChange={(iso: string) => {
                  const dateIso = isoDateInTimeZone(new Date(iso), timeZone);
                  const hm = hmInTimeZone(new Date(iso), timeZone);
                  const [hour, minute] = hm.split(':').map(Number);
                  editForm.setFieldsValue({
                    date: dayjs(dateIso),
                    time: dayjs().hour(hour ?? 0).minute(minute ?? 0),
                    slotTime: iso,
                  });
                }}
                allowClear
              />
            </Form.Item>
          ) : null}

          <SectionLabel>Details</SectionLabel>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="occasion" label="Occasion">
                <Select options={OCCASION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="tableId"
                label="Table"
                extra="Leave empty to auto-assign"
              >
                <Select
                  allowClear
                  placeholder="Auto-assign"
                  options={tableOptionsForParty(
                    editPartySize,
                    editing?.tables?.[0]?.id ?? editing?.tableIds?.[0],
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="guestNotes" label="Special requests" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  placeholder="Allergies, high chair, window seat…"
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <CancelReservationModal
        open={!!cancelFor}
        guestName={cancelFor ? formatGuestName(cancelFor.diner) : undefined}
        loading={updatingStatus}
        onClose={() => setCancelFor(null)}
        onConfirm={async (reason) => {
          if (!cancelFor) return;
          const ok = await runStatusUpdate(
            cancelFor.id,
            'cancelled',
            reason,
            'Reservation cancelled',
          );
          if (ok) setCancelFor(null);
        }}
      />

      <RefundDepositModal
        open={!!refundFor}
        isHold={refundFor?.depositStatus === 'authorized'}
        guestName={refundFor ? guestName(refundFor) : undefined}
        amountLabel={refundFor ? formatUsd(refundFor.depositAmountCents) : null}
        maxRefundableCents={
          refundFor
            ? refundFor.depositRefundableCents ??
              Math.max(
                0,
                (refundFor.depositAmountCents ?? 0) - (refundFor.depositRefundedCents ?? 0),
              )
            : null
        }
        loading={refunding}
        onClose={() => setRefundFor(null)}
        onConfirm={async (reason, amountCents) => {
          if (!refundFor) return;
          const isHold = refundFor.depositStatus === 'authorized';
          try {
            await refundDeposit({
              variables: { id: refundFor.id, reason, amountCents },
            });
            message.success(
              isHold
                ? 'Deposit hold released'
                : amountCents != null &&
                    amountCents <
                      (refundFor.depositRefundableCents ?? refundFor.depositAmountCents ?? 0)
                  ? 'Partial deposit refunded'
                  : 'Deposit refunded',
            );
            setRefundFor(null);
            refetch();
          } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'Refund failed');
            throw err;
          }
        }}
      />
    </Space></div>
  );
}

export default function ReservationsPage() {
  return (
    <div component="ReservationsPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <ReservationsPageContent />
    </Suspense></div>
  );
}
