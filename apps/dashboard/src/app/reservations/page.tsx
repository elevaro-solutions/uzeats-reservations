'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
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
import { MoreOutlined, PlusOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { PageHeader, StatusTag, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  AVAILABILITY,
  CREATE_OWNER_RESERVATION,
  DELETE_RESERVATION,
  MY_RESTAURANTS,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Text } = Typography;

const OCCASION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'business', label: 'Business' },
  { value: 'date', label: 'Date' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'other', label: 'Other' },
];

type ReservationRow = {
  id: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string;
  occasion?: string;
  guestNotes?: string;
  source?: string;
  tableIds?: string[];
  diner?: { id?: string; firstName?: string; lastName?: string; phone?: string; email?: string };
  tables?: { id: string; name: string }[];
};

type TableOption = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
};

function formatOccasion(occasion?: string) {
  if (!occasion || occasion === 'none') return null;
  return occasion.charAt(0).toUpperCase() + occasion.slice(1);
}

function combineDateTime(date: Dayjs, time: Dayjs) {
  return date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0);
}

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(dayjs());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ReservationRow | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const createPartySize = Form.useWatch('partySize', createForm) ?? 2;
  const createDate = Form.useWatch('date', createForm);
  const editPartySize = Form.useWatch('partySize', editForm) ?? 2;
  const editDate = Form.useWatch('date', editForm);

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (restData?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [restData],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);

  const activeRestaurant = useMemo(
    () => (restData?.myRestaurants ?? []).find((r: { id: string }) => r.id === restaurantId),
    [restData, restaurantId],
  );

  const tables: TableOption[] = useMemo(
    () =>
      ((activeRestaurant?.tables ?? []) as TableOption[]).filter((t) => t.active !== false),
    [activeRestaurant],
  );

  const { data, refetch, loading } = useQuery(RESTAURANT_RESERVATIONS, {
    skip: !restaurantId,
    variables: { restaurantId, date: date.format('YYYY-MM-DD') },
  });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);
  const [createReservation, { loading: creating }] = useMutation(CREATE_OWNER_RESERVATION);
  const [updateReservation, { loading: updating }] = useMutation(UPDATE_RESERVATION);
  const [deleteReservation, { loading: deleting }] = useMutation(DELETE_RESERVATION);

  const createDateStr = (createDate as Dayjs | undefined)?.format('YYYY-MM-DD');
  const editDateStr = (editDate as Dayjs | undefined)?.format('YYYY-MM-DD');

  const { data: createSlotsData } = useQuery(AVAILABILITY, {
    skip: !restaurantId || !createOpen || !createDateStr,
    variables: {
      restaurantId,
      date: createDateStr,
      partySize: createPartySize,
    },
  });

  const { data: editSlotsData } = useQuery(AVAILABILITY, {
    skip: !restaurantId || !editing || !editDateStr,
    variables: {
      restaurantId,
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
        label: dayjs(s.time).format('h:mm A'),
      }));

  const openCreate = () => {
    createForm.setFieldsValue({
      date,
      time: date.hour(19).minute(0),
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

  const openEdit = (r: ReservationRow) => {
    const slot = dayjs(r.slotStart);
    setEditing(r);
    editForm.setFieldsValue({
      date: slot,
      time: slot,
      partySize: r.partySize,
      occasion: r.occasion ?? 'none',
      guestNotes: r.guestNotes ?? '',
      tableId: r.tables?.[0]?.id ?? r.tableIds?.[0],
      slotTime: r.slotStart,
    });
  };

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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const slotStart = combineDateTime(values.date, values.time).toISOString();
      await createReservation({
        variables: {
          input: {
            restaurantId,
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
      setDate(values.date);
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
        : combineDateTime(values.date, values.time).toISOString();
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
    const items: NonNullable<MenuProps['items']> = [];

    if (['pending', 'confirmed', 'seated'].includes(r.status)) {
      items.push({
        key: 'edit',
        label: 'Edit',
        onClick: () => openEdit(r),
      });
    }

    if (r.status === 'confirmed') {
      items.push({
        key: 'seat',
        label: 'Seat',
        onClick: () => runStatusUpdate(r.id, 'seated'),
      });
      items.push({
        key: 'no_show',
        label: 'No-show',
        onClick: () => runStatusUpdate(r.id, 'no_show'),
      });
    }

    if (r.status === 'seated') {
      items.push({
        key: 'complete',
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
        label: 'Cancel',
        danger: true,
        onClick: () => runStatusUpdate(r.id, 'cancelled', 'Cancelled by restaurant'),
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
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(r),
    });

    return items;
  };

  return (
    <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="Reservations"
        subtitle="Create, edit, and manage covers for your restaurant"
        extra={
          <Space wrap>
            <Select
              style={{ width: 240 }}
              value={restaurantId}
              onChange={setRestaurantId}
              options={(restData?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
                value: r.id,
                label: r.name,
              }))}
              placeholder="Restaurant"
            />
            <DatePicker value={date} onChange={(d) => d && setDate(d)} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!restaurantId}>
              New reservation
            </Button>
          </Space>
        }
      />
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
        <Table<ReservationRow>
          loading={loading}
          rowKey="id"
          dataSource={(data?.restaurantReservations ?? []) as ReservationRow[]}
          scroll={{ x: 1040 }}
          columns={[
            {
              title: 'Time',
              dataIndex: 'slotStart',
              width: 90,
              render: (v: string) =>
                new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            },
            {
              title: 'Guest',
              render: (_: unknown, r) => {
                const name =
                  `${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim() || '—';
                return (
                  <Space direction="vertical" size={0}>
                    <Text>{name}</Text>
                    {r.diner?.phone ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.diner.phone}
                      </Text>
                    ) : null}
                  </Space>
                );
              },
            },
            { title: 'Party', dataIndex: 'partySize', width: 70 },
            {
              title: 'Table',
              render: (_: unknown, r) =>
                (r.tables ?? []).map((t) => t.name).join(', ') || '—',
            },
            {
              title: 'Source',
              dataIndex: 'source',
              width: 90,
              render: (source?: string) =>
                source ? <Tag>{source}</Tag> : <Text type="secondary">—</Text>,
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
              width: 90,
              fixed: 'right',
              render: (_: unknown, r) => (
                <Dropdown menu={{ items: actionItems(r) }} trigger={['click']} placement="bottomRight">
                  <Button size="small" icon={<MoreOutlined />}>
                    More
                  </Button>
                </Dropdown>
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
        okText="Create"
        width={560}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 8 }}>
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="time" label="Time" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <TimePicker format="h:mm A" minuteStep={15} use12Hours />
            </Form.Item>
            <Form.Item
              name="partySize"
              label="Party size"
              rules={[{ required: true }]}
              style={{ marginBottom: 12 }}
            >
              <InputNumber min={1} max={50} />
            </Form.Item>
          </Space>

          {(createSlotsData?.availability ?? []).length > 0 ? (
            <Form.Item label="Available slots" style={{ marginBottom: 12 }}>
              <Select
                placeholder="Pick an open slot"
                options={slotOptions(createSlotsData?.availability)}
                onChange={(iso: string) => {
                  const slot = dayjs(iso);
                  createForm.setFieldsValue({ date: slot, time: slot });
                }}
                allowClear
              />
            </Form.Item>
          ) : null}

          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item
              name="firstName"
              label="First name"
              rules={[{ required: true, message: 'Required' }]}
              style={{ marginBottom: 12, minWidth: 160 }}
            >
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last name" style={{ marginBottom: 12, minWidth: 160 }}>
              <Input />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="phone" label="Phone" style={{ marginBottom: 12, minWidth: 180 }}>
              <Input placeholder="+15551234567" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Invalid email' }]}
              style={{ marginBottom: 12, minWidth: 200 }}
            >
              <Input />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="source" label="Source" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'phone', label: 'Phone' },
                  { value: 'walkin', label: 'Walk-in' },
                ]}
              />
            </Form.Item>
            <Form.Item name="occasion" label="Occasion" style={{ marginBottom: 12 }}>
              <Select style={{ width: 160 }} options={OCCASION_OPTIONS} />
            </Form.Item>
            <Form.Item name="tableId" label="Table" style={{ marginBottom: 12 }}>
              <Select
                allowClear
                placeholder="Auto-assign"
                style={{ width: 200 }}
                options={tableOptionsForParty(createPartySize)}
              />
            </Form.Item>
          </Space>

          <Form.Item name="guestNotes" label="Notes" style={{ marginBottom: 12 }}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>

          <Form.Item
            name="seatImmediately"
            label="Seat now"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit reservation"
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={handleEdit}
        confirmLoading={updating}
        okText="Save"
        width={520}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 8 }}>
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <DatePicker
                onChange={() => editForm.setFieldsValue({ slotTime: undefined })}
              />
            </Form.Item>
            <Form.Item name="time" label="Time" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <TimePicker
                format="h:mm A"
                minuteStep={15}
                use12Hours
                onChange={() => editForm.setFieldsValue({ slotTime: undefined })}
              />
            </Form.Item>
            <Form.Item
              name="partySize"
              label="Party size"
              rules={[{ required: true }]}
              style={{ marginBottom: 12 }}
            >
              <InputNumber min={1} max={50} />
            </Form.Item>
          </Space>

          <Form.Item name="slotTime" hidden>
            <Input />
          </Form.Item>

          {(editSlotsData?.availability ?? []).length > 0 ? (
            <Form.Item label="Available slots" style={{ marginBottom: 12 }}>
              <Select
                placeholder="Pick an open slot"
                options={slotOptions(editSlotsData?.availability, editing?.slotStart)}
                value={editForm.getFieldValue('slotTime')}
                onChange={(iso: string) => {
                  const slot = dayjs(iso);
                  editForm.setFieldsValue({ date: slot, time: slot, slotTime: iso });
                }}
                allowClear
              />
            </Form.Item>
          ) : null}

          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="occasion" label="Occasion" style={{ marginBottom: 12 }}>
              <Select style={{ width: 160 }} options={OCCASION_OPTIONS} />
            </Form.Item>
            <Form.Item name="tableId" label="Table" style={{ marginBottom: 12 }}>
              <Select
                allowClear
                placeholder="Auto-assign"
                style={{ width: 200 }}
                options={tableOptionsForParty(
                  editPartySize,
                  editing?.tables?.[0]?.id ?? editing?.tableIds?.[0],
                )}
              />
            </Form.Item>
          </Space>

          <Form.Item name="guestNotes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
