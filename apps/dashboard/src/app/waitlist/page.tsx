'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  MoreOutlined,
  NotificationOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  PageHeader,
  PhoneInput,
  StatusTag,
  colors,
  radii,
  usPhoneRules,
} from '@reservations/ui';
import {
  formatWaitlistWaitingLabel,
  isActiveWaitlistWaitStatus,
  isWaitlistWaitOverdue,
  restaurantTimeZone,
  todayIsoInTimeZone,
  waitlistPromisedMinutes,
  waitlistWaitingMinutes,
} from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  RESTAURANT_WAITLIST_FULL,
  ADD_IN_HOUSE_WAITLIST,
  UPDATE_WAITLIST_ENTRY,
  UPDATE_WAITLIST_STATUS,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { skipPollWhenHidden } from '@/lib/pollVisibility';
import {
  WaitlistGuestSelect,
  type WaitlistGuestOption,
} from '@/components/WaitlistGuestSelect';

const { Text } = Typography;

type WaitlistEntry = {
  id: string;
  partySize: number;
  preferredDate?: string | null;
  preferredTimeStart?: string | null;
  preferredTimeEnd?: string | null;
  status: string;
  createdAt: string;
  guestName?: string | null;
  guestPhone?: string | null;
  source?: string | null;
  quotedWaitMinutes?: number | null;
  position?: number | null;
  estimatedWaitMinutes?: number | null;
  waitingMinutes?: number | null;
  promisedWaitMinutes?: number | null;
  isOverdue?: boolean | null;
  reservationId?: string | null;
  dinerId?: string | null;
  diner?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
};

type QueueFilter = 'active' | 'history' | 'all';
type SourceFilter = 'all' | 'online' | 'in_house';

const ACTIVE_STATUSES = ['waiting', 'notified'];
const HISTORY_STATUSES = ['seated', 'booked', 'expired', 'cancelled'];

function toastForStatus(status: string): string {
  switch (status) {
    case 'notified':
      return 'Guest notified';
    case 'seated':
      return 'Guest seated';
    case 'cancelled':
      return 'Removed from waitlist';
    default:
      return `Entry marked ${status}`;
  }
}

function WaitlistPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('active');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  /** Live queue defaults to all dates (future online joins); history defaults to today. */
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('all');
  const [form] = Form.useForm();
  const [selectedGuest, setSelectedGuest] = useState<WaitlistGuestOption | null>(null);
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = restData?.myRestaurants ?? [];
  const { activeRestaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);

  const activeRestaurant = useMemo(
    () => restaurants.find((r: { id: string }) => r.id === activeRestaurantId),
    [restaurants, activeRestaurantId],
  );
  const restaurantTz = restaurantTimeZone(activeRestaurant ?? {});
  const todayIso = todayIsoInTimeZone(restaurantTz);

  const statuses = useMemo(() => {
    if (queueFilter === 'active') return ACTIVE_STATUSES;
    if (queueFilter === 'history') return HISTORY_STATUSES;
    return [...ACTIVE_STATUSES, ...HISTORY_STATUSES];
  }, [queueFilter]);

  const effectiveDateFilter =
    queueFilter === 'history' && dateFilter === 'all' ? 'today' : dateFilter;

  const { data, loading, refetch } = useQuery(RESTAURANT_WAITLIST_FULL, {
    skip: !activeRestaurantId,
    variables: {
      restaurantId: activeRestaurantId,
      limit,
      offset,
      statuses,
      preferredDate: effectiveDateFilter === 'today' ? todayIso : undefined,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
    },
    pollInterval: 15_000,
    skipPollAttempt: skipPollWhenHidden,
  });
  const [addEntry, { loading: adding }] = useMutation(ADD_IN_HOUSE_WAITLIST);
  const [updateEntry, { loading: saving }] = useMutation(UPDATE_WAITLIST_ENTRY);
  const [updateStatus, { loading: updating }] = useMutation(UPDATE_WAITLIST_STATUS);
  /** Tick so “Waiting Xm” advances between 15s polls. */
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setEditingEntry(null);
    setSelectedGuest(null);
    form.resetFields();
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setSelectedGuest(null);
    form.resetFields();
    form.setFieldsValue({ partySize: 2, quotedWaitMinutes: 15 });
    setModalMode('add');
  };

  const openEditModal = (entry: WaitlistEntry) => {
    const name =
      entry.guestName ??
      ([entry.diner?.firstName, entry.diner?.lastName].filter(Boolean).join(' ') || '');
    const phone = entry.guestPhone ?? entry.diner?.phone ?? undefined;
    setEditingEntry(entry);
    if (entry.dinerId) {
      setSelectedGuest({
        dinerId: entry.dinerId,
        guestName: name || 'Guest',
        guestPhone: phone,
        label: name || 'Guest',
      });
    } else {
      setSelectedGuest(null);
    }
    form.setFieldsValue({
      guestName: name,
      guestPhone: phone,
      partySize: entry.partySize,
      quotedWaitMinutes: entry.quotedWaitMinutes ?? undefined,
    });
    setModalMode('edit');
  };

  const handleFormSubmit = async (values: {
    guestName: string;
    guestPhone?: string;
    partySize: number;
    quotedWaitMinutes?: number;
  }) => {
    if (modalMode === 'edit' && editingEntry) {
      try {
        const hadDiner = Boolean(editingEntry.dinerId);
        const clearDiner = hadDiner && !selectedGuest?.dinerId;
        const input: Record<string, unknown> = {
          id: editingEntry.id,
          guestName: values.guestName,
          guestPhone: values.guestPhone || '',
          partySize: values.partySize,
          quotedWaitMinutes: values.quotedWaitMinutes ?? null,
        };
        if (clearDiner) {
          input.dinerId = null;
        } else if (selectedGuest?.dinerId) {
          input.dinerId = selectedGuest.dinerId;
        }
        await updateEntry({ variables: { input } });
        message.success('Waitlist entry updated');
        closeModal();
        refetch();
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to update entry');
      }
      return;
    }

    if (!activeRestaurantId) return;
    try {
      await addEntry({
        variables: {
          input: {
            restaurantId: activeRestaurantId,
            dinerId: selectedGuest?.dinerId || undefined,
            guestName: values.guestName,
            guestPhone: values.guestPhone || undefined,
            partySize: values.partySize,
            quotedWaitMinutes: values.quotedWaitMinutes ?? undefined,
          },
        },
      });
      message.success(
        selectedGuest ? 'Guest added to waitlist' : 'Walk-in added to waitlist',
      );
      closeModal();
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to add walk-in');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus({ variables: { id, status } });
      message.success(toastForStatus(status));
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const guestName = (entry: WaitlistEntry) =>
    entry.guestName ??
    ([entry.diner?.firstName, entry.diner?.lastName].filter(Boolean).join(' ') || '—');

  const guestMeta = (entry: WaitlistEntry) => {
    const parts: string[] = [];
    parts.push(
      entry.source === 'in_house'
        ? entry.dinerId
          ? 'Walk-in · Account'
          : 'Walk-in'
        : 'Online',
    );
    if (entry.preferredDate) {
      const timeLabel =
        entry.preferredTimeStart && entry.preferredTimeEnd
          ? `${entry.preferredDate} · ${entry.preferredTimeStart}–${entry.preferredTimeEnd}`
          : entry.preferredTimeStart
            ? `${entry.preferredDate} · ${entry.preferredTimeStart}`
            : entry.preferredDate;
      parts.push(timeLabel);
    }
    return parts.join(' · ');
  };

  const liveWaiting = (entry: WaitlistEntry) => {
    if (!isActiveWaitlistWaitStatus(entry.status)) return null;
    return waitlistWaitingMinutes(entry.createdAt, new Date(nowMs));
  };

  const liveOverdue = (entry: WaitlistEntry, waitingMinutes: number | null) => {
    if (waitingMinutes == null) return false;
    return isWaitlistWaitOverdue({
      status: entry.status,
      waitingMinutes,
      quotedWaitMinutes: entry.quotedWaitMinutes,
      estimatedWaitMinutes: entry.estimatedWaitMinutes,
    });
  };

  const waitLabel = (entry: WaitlistEntry) => {
    const waiting = liveWaiting(entry);
    if (waiting != null) {
      const promised = waitlistPromisedMinutes({
        quotedWaitMinutes: entry.quotedWaitMinutes,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
      });
      return {
        primary: formatWaitlistWaitingLabel(waiting),
        secondary: `promise ~${promised} min`,
        overdue: liveOverdue(entry, waiting),
      };
    }
    if (entry.estimatedWaitMinutes != null) {
      return { primary: `~${entry.estimatedWaitMinutes} min`, secondary: null, overdue: false };
    }
    if (entry.quotedWaitMinutes != null) {
      return { primary: `${entry.quotedWaitMinutes} min`, secondary: null, overdue: false };
    }
    return { primary: '—', secondary: null, overdue: false };
  };

  const actionItems = (entry: WaitlistEntry): MenuProps['items'] => {
    const terminal = ['seated', 'cancelled', 'expired', 'booked'].includes(entry.status);
    if (terminal) return [];

    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => openEditModal(entry),
      },
    ];
    if (entry.status === 'waiting') {
      items.push({
        key: 'notify',
        icon: <NotificationOutlined />,
        label: 'Notify',
        onClick: () => void handleStatusChange(entry.id, 'notified'),
      });
    }
    items.push({
      key: 'seat',
      icon: <CheckCircleOutlined />,
      label: 'Seat',
      onClick: () => void handleStatusChange(entry.id, 'seated'),
    });
    items.push({ type: 'divider' });
    items.push({
      key: 'cancel',
      icon: <CloseCircleOutlined />,
      label: 'Cancel',
      danger: true,
      onClick: () => void handleStatusChange(entry.id, 'cancelled'),
    });
    return items;
  };

  return (
    <div component="WaitlistPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <PageHeader
          title="Waitlist"
          subtitle="Track walk-ins and online parties waiting for a table"
          extra={
            <Space wrap>
              <Select style={{ width: 260 }} {...restaurantSelectProps} />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddModal}
                disabled={!activeRestaurantId}
              >
                Add walk-in
              </Button>
            </Space>
          }
        />

        <Space wrap>
          <Select
            value={queueFilter}
            style={{ width: 160 }}
            onChange={(v: QueueFilter) => {
              setQueueFilter(v);
              if (v === 'history') setDateFilter('today');
            }}
            options={[
              { value: 'active', label: 'Live queue' },
              { value: 'history', label: 'History' },
              { value: 'all', label: 'All statuses' },
            ]}
          />
          <Select
            value={sourceFilter}
            style={{ width: 140 }}
            onChange={(v: SourceFilter) => setSourceFilter(v)}
            options={[
              { value: 'all', label: 'All sources' },
              { value: 'in_house', label: 'Walk-in' },
              { value: 'online', label: 'Online' },
            ]}
          />
          <Select
            value={dateFilter}
            style={{ width: 140 }}
            onChange={(v: 'today' | 'all') => setDateFilter(v)}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'all', label: 'All dates' },
            ]}
          />
        </Space>

        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
          <Table<WaitlistEntry>
            loading={loading || updating}
            rowKey="id"
            tableLayout="fixed"
            dataSource={(data?.restaurantWaitlist?.items ?? []) as WaitlistEntry[]}
            pagination={tablePagination(data?.restaurantWaitlist?.total ?? 0)}
            columns={[
              {
                title: '#',
                dataIndex: 'position',
                width: '8%',
                render: (v: number | null, entry) =>
                  entry.status === 'waiting' && v != null ? (
                    <Text strong style={{ color: colors.brand[700] }}>
                      {v}
                    </Text>
                  ) : (
                    <Text type="secondary">—</Text>
                  ),
              },
              {
                title: 'Guest',
                key: 'guest',
                ellipsis: true,
                render: (_: unknown, entry) => (
                  <Space orientation="vertical" size={0}>
                    <Text>{guestName(entry)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {guestMeta(entry)}
                    </Text>
                  </Space>
                ),
              },
              {
                title: 'Party',
                dataIndex: 'partySize',
                width: '10%',
              },
              {
                title: 'Waiting',
                key: 'wait',
                width: '18%',
                render: (_: unknown, entry) => {
                  const label = waitLabel(entry);
                  if (label.primary === '—') return <Text type="secondary">—</Text>;
                  return (
                    <Space orientation="vertical" size={0}>
                      <Space size={6} wrap>
                        <Text strong={label.overdue} style={label.overdue ? { color: colors.error } : undefined}>
                          {label.primary}
                        </Text>
                        {label.overdue ? <Tag color="error">Overdue</Tag> : null}
                      </Space>
                      {label.secondary ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {label.secondary}
                        </Text>
                      ) : null}
                    </Space>
                  );
                },
              },
              {
                title: 'Status',
                dataIndex: 'status',
                width: '14%',
                render: (s: string) => <StatusTag status={s} />,
              },
              {
                title: '',
                key: 'actions',
                width: 56,
                align: 'right' as const,
                render: (_: unknown, entry) => {
                  const items = actionItems(entry);
                  if (!items?.length) return null;
                  return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                      <Button
                        size="small"
                        type="text"
                        icon={<MoreOutlined />}
                        aria-label="More actions"
                      />
                    </Dropdown>
                  );
                },
              },
            ]}
          />
        </Card>

        <Modal
          title={modalMode === 'edit' ? 'Edit waitlist entry' : 'Add walk-in'}
          open={modalMode != null}
          onCancel={closeModal}
          onOk={() => form.submit()}
          okText={modalMode === 'edit' ? 'Save changes' : 'Add to waitlist'}
          confirmLoading={adding || saving}
          destroyOnClose
          centered
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
            initialValues={{ partySize: 2, quotedWaitMinutes: 15 }}
          >
            <Form.Item
              label="Existing guest"
              tooltip="Search diner accounts by name, phone, or email. Guest-book visits are listed first."
            >
              <WaitlistGuestSelect
                restaurantId={activeRestaurantId}
                value={selectedGuest}
                disabled={adding}
                onChange={(guest) => {
                  setSelectedGuest(guest);
                  if (!guest) return;
                  form.setFieldsValue({
                    guestName: guest.guestName,
                    guestPhone: guest.guestPhone,
                  });
                }}
              />
            </Form.Item>
            <Form.Item name="guestName" label="Guest name" rules={[{ required: true }]}>
              <Input
                placeholder="e.g. Jane Smith"
                onChange={() => {
                  if (selectedGuest) setSelectedGuest(null);
                }}
              />
            </Form.Item>
            <Form.Item name="guestPhone" label="Phone" rules={usPhoneRules()}>
              <PhoneInput
                placeholder="Optional — needed for SMS notify"
                onChange={() => {
                  if (selectedGuest) setSelectedGuest(null);
                }}
              />
            </Form.Item>
            <Form.Item name="partySize" label="Party size" rules={[{ required: true }]}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="quotedWaitMinutes" label="Quoted wait (minutes)">
              <InputNumber min={0} step={5} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <div component="WaitlistPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <WaitlistPageContent />
      </Suspense>
    </div>
  );
}
