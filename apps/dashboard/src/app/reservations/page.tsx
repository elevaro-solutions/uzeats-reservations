'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Button, Card, DatePicker, Dropdown, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatusTag } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';

const { Title, Text } = Typography;

function formatOccasion(occasion?: string) {
  if (!occasion || occasion === 'none') return null;
  return occasion.charAt(0).toUpperCase() + occasion.slice(1);
}

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [date, setDate] = useState(dayjs());

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, refetch, loading } = useQuery(RESTAURANT_RESERVATIONS, {
    skip: !restaurantId,
    variables: { restaurantId, date: date.format('YYYY-MM-DD') },
  });
  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('activeRestaurantId');
    const first = restData?.myRestaurants?.[0]?.id;
    setRestaurantId(saved ?? first);
  }, [restData]);

  const runStatusUpdate = async (
    id: string,
    status: string,
    reason?: string,
    successMessage?: string,
  ) => {
    await updateStatus({ variables: { id, status, reason } });
    if (successMessage) message.success(successMessage);
    refetch();
  };

  const actionItems = (r: {
    id: string;
    status: string;
  }): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [];

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
        onClick: () =>
          runStatusUpdate(r.id, 'cancelled', 'Cancelled by restaurant'),
      });
    }

    return items.length > 0
      ? items
      : [{ key: 'none', label: 'No actions available', disabled: true }];
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Reservations</Title>
      <Space>
        <Select
          style={{ width: 260 }}
          value={restaurantId}
          onChange={(id) => {
            setRestaurantId(id);
            localStorage.setItem('activeRestaurantId', id);
          }}
          options={(restData?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
            value: r.id,
            label: r.name,
          }))}
        />
        <DatePicker value={date} onChange={(d) => d && setDate(d)} />
      </Space>
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.restaurantReservations ?? []}
          scroll={{ x: 960 }}
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
              render: (_: unknown, r: { diner?: { firstName?: string; lastName?: string } }) =>
                `${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`.trim() || '—',
            },
            { title: 'Party', dataIndex: 'partySize', width: 70 },
            {
              title: 'Table',
              render: (_: unknown, r: { tables?: { name: string }[] }) =>
                (r.tables ?? []).map((t) => t.name).join(', ') || '—',
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
              render: (_: unknown, r: { id: string; status: string }) => (
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
    </Space>
  );
}
