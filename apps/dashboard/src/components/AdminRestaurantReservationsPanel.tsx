'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EyeOutlined, LoginOutlined, MoreOutlined, ReloadOutlined, UserDeleteOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { StatusTag, spacing } from '@reservations/ui';
import {
  DELETE_RESERVATION,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';
import { CancelReservationModal } from '@/components/CancelReservationModal';
import { guestName as formatGuestName } from '@/lib/reservationFormat';

const { Text } = Typography;

type ReservationRow = {
  id: string;
  status: string;
  partySize: number;
  slotStart: string;
  slotEnd?: string;
  occasion?: string;
  guestNotes?: string;
  source?: string;
  diner?: { firstName?: string; lastName?: string; phone?: string; email?: string };
  tables?: { id: string; name: string }[];
};

export function AdminRestaurantReservationsPanel({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const { data, loading, refetch } = useQuery(RESTAURANT_RESERVATIONS, {
    variables: {
      restaurantId,
      date: date.format('YYYY-MM-DD'),
      limit: 100,
      offset: 0,
    },
  });
  const [updateStatus, { loading: updating }] = useMutation(UPDATE_RESERVATION_STATUS);
  const [deleteReservation] = useMutation(DELETE_RESERVATION);
  const [cancelFor, setCancelFor] = useState<ReservationRow | null>(null);

  const items: ReservationRow[] = data?.restaurantReservations?.items ?? [];

  const runStatus = async (id: string, status: string, successMessage: string, reason?: string) => {
    try {
      await updateStatus({ variables: { id, status, reason } });
      message.success(successMessage);
      refetch();
      return true;
    } catch (err: any) {
      message.error(err.message || 'Update failed');
      return false;
    }
  };

  const rowMenu = (r: ReservationRow): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View details',
        onClick: () => router.push(`/admin/reservations/${r.id}`),
      },
    ];
    if (['pending', 'confirmed', 'seated'].includes(r.status)) {
      items.push({
        key: 'edit',
        icon: <CalendarOutlined />,
        label: 'Change date & time',
        onClick: () => router.push(`/admin/reservations/${r.id}?edit=1`),
      });
    }
    items.push({ type: 'divider' });
    if (r.status === 'pending') {
      items.push({
        key: 'confirm',
        icon: <CheckCircleOutlined />,
        label: 'Confirm',
        onClick: () => void runStatus(r.id, 'confirmed', 'Confirmed'),
      });
    }
    if (r.status === 'confirmed') {
      items.push({
        key: 'seat',
        icon: <LoginOutlined />,
        label: 'Seat',
        onClick: () => void runStatus(r.id, 'seated', 'Seated'),
      });
    }
    if (r.status === 'seated') {
      items.push({
        key: 'complete',
        icon: <CheckCircleOutlined />,
        label: 'Complete',
        onClick: () => void runStatus(r.id, 'completed', 'Completed'),
      });
    }
    if (r.status === 'confirmed' || r.status === 'seated') {
      items.push({
        key: 'no_show',
        icon: <UserDeleteOutlined />,
        label: 'No-show',
        onClick: () => void runStatus(r.id, 'no_show', 'Marked no-show'),
      });
    }
    if (r.status === 'pending' || r.status === 'confirmed') {
      items.push({
        key: 'cancel',
        icon: <CloseCircleOutlined />,
        danger: true,
        label: 'Cancel',
        onClick: () => setCancelFor(r),
      });
    }
    items.push({ type: 'divider' });
    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      danger: true,
      label: 'Delete',
      onClick: async () => {
        try {
          await deleteReservation({ variables: { id: r.id } });
          message.success('Reservation deleted');
          refetch();
        } catch (err: any) {
          message.error(err.message || 'Delete failed');
        }
      },
    });
    return items;
  };

  return (
    <Card>
      <Space wrap style={{ marginBottom: spacing.md, width: '100%' }}>
        <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
          Refresh
        </Button>
        <Text type="secondary">
          {data?.restaurantReservations?.total ?? 0} reservation
          {(data?.restaurantReservations?.total ?? 0) === 1 ? '' : 's'} on {date.format('MMM D, YYYY')}
        </Text>
      </Space>
      <Table
        loading={loading || updating}
        rowKey="id"
        dataSource={items}
        pagination={false}
        columns={[
          {
            title: 'Time',
            dataIndex: 'slotStart',
            width: 100,
            render: (v: string, r: ReservationRow) => (
              <Link href={`/admin/reservations/${r.id}`}>{dayjs(v).format('h:mm A')}</Link>
            ),
          },
          {
            title: 'Guest',
            render: (_: unknown, r: ReservationRow) => {
              const name = [r.diner?.firstName, r.diner?.lastName].filter(Boolean).join(' ');
              return (
                <Space orientation="vertical" size={0}>
                  <Text>{name || 'Walk-in / phone'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[r.diner?.phone, r.diner?.email].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </Space>
              );
            },
          },
          { title: 'Party', dataIndex: 'partySize', width: 70 },
          {
            title: 'Table',
            width: 100,
            render: (_: unknown, r: ReservationRow) =>
              r.tables?.map((t) => t.name).join(', ') || '—',
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (s: string) => <StatusTag status={s} />,
          },
          {
            title: 'Source',
            dataIndex: 'source',
            width: 90,
            render: (s?: string) => (s ? <Tag>{s}</Tag> : '—'),
          },
          {
            title: '',
            width: 56,
            render: (_: unknown, r: ReservationRow) => (
              <Dropdown menu={{ items: rowMenu(r) }} trigger={['click']}>
                <Button size="small" icon={<MoreOutlined />} aria-label="Reservation actions" />
              </Dropdown>
            ),
          },
        ]}
      />

      <CancelReservationModal
        open={!!cancelFor}
        guestName={cancelFor ? formatGuestName(cancelFor.diner) : undefined}
        loading={updating}
        onClose={() => setCancelFor(null)}
        onConfirm={async (reason) => {
          if (!cancelFor) return;
          const ok = await runStatus(cancelFor.id, 'cancelled', 'Reservation cancelled', reason);
          if (ok) setCancelFor(null);
        }}
      />
    </Card>
  );
}
