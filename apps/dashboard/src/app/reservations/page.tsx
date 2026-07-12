'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Button, Card, DatePicker, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { StatusTag } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  RESTAURANT_RESERVATIONS,
  UPDATE_RESERVATION_STATUS,
} from '@/lib/graphql';

const { Title } = Typography;

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
          options={(restData?.myRestaurants ?? []).map((r: any) => ({
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
          columns={[
            {
              title: 'Time',
              dataIndex: 'slotStart',
              render: (v: string) =>
                new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            },
            {
              title: 'Guest',
              render: (_: unknown, r: any) =>
                `${r.diner?.firstName ?? ''} ${r.diner?.lastName ?? ''}`,
            },
            { title: 'Party', dataIndex: 'partySize' },
            {
              title: 'Table',
              render: (_: unknown, r: any) =>
                (r.tables ?? []).map((t: any) => t.name).join(', '),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Actions',
              render: (_: unknown, r: any) => (
                <Space>
                  {r.status === 'confirmed' && (
                    <Button
                      size="small"
                      onClick={async () => {
                        await updateStatus({ variables: { id: r.id, status: 'seated' } });
                        refetch();
                      }}
                    >
                      Seat
                    </Button>
                  )}
                  {r.status === 'seated' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={async () => {
                        await updateStatus({ variables: { id: r.id, status: 'completed' } });
                        message.success('Marked completed — loyalty points awarded');
                        refetch();
                      }}
                    >
                      Complete
                    </Button>
                  )}
                  {['pending', 'confirmed'].includes(r.status) && (
                    <Button
                      size="small"
                      danger
                      onClick={async () => {
                        await updateStatus({
                          variables: { id: r.id, status: 'cancelled', reason: 'Cancelled by restaurant' },
                        });
                        refetch();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  {r.status === 'confirmed' && (
                    <Button
                      size="small"
                      onClick={async () => {
                        await updateStatus({ variables: { id: r.id, status: 'no_show' } });
                        refetch();
                      }}
                    >
                      No-show
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
