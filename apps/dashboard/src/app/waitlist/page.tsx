'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
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
import { PlusOutlined } from '@ant-design/icons';
import { PhoneInput, usPhoneRules } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  RESTAURANT_WAITLIST_FULL,
  ADD_IN_HOUSE_WAITLIST,
  UPDATE_WAITLIST_STATUS,
} from '@/lib/graphql';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  waiting: 'blue',
  notified: 'gold',
  booked: 'cyan',
  seated: 'green',
  expired: 'default',
  cancelled: 'red',
};

function WaitlistPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { limit, offset, tablePagination } = useUrlPagination({ defaultPageSize: 20 });
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data, loading, refetch } = useQuery(RESTAURANT_WAITLIST_FULL, {
    skip: !restaurantId,
    variables: { restaurantId, limit, offset },
  });
  const [addEntry, { loading: adding }] = useMutation(ADD_IN_HOUSE_WAITLIST);
  const [updateStatus, { loading: updating }] = useMutation(UPDATE_WAITLIST_STATUS);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  const handleAddWalkIn = async (values: any) => {
    if (!restaurantId) return;
    try {
      await addEntry({
        variables: {
          input: {
            restaurantId,
            guestName: values.guestName,
            guestPhone: values.guestPhone || undefined,
            partySize: values.partySize,
            quotedWaitMinutes: values.quotedWaitMinutes ?? undefined,
          },
        },
      });
      message.success('Walk-in added to waitlist');
      setModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err.message ?? 'Failed to add walk-in');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus({ variables: { id, status } });
      message.success(`Entry marked ${status}`);
      refetch();
    } catch (err: any) {
      message.error(err.message ?? 'Failed to update status');
    }
  };

  const guestName = (entry: any) =>
    entry.guestName ??
    ([entry.diner?.firstName, entry.diner?.lastName].filter(Boolean).join(' ') || '—');

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Waitlist
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={!restaurantId}
        >
          Add walk-in
        </Button>
      </div>
      <Select
        style={{ width: 280 }}
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
      <Card>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={data?.restaurantWaitlist?.items ?? []}
          pagination={tablePagination(data?.restaurantWaitlist?.total ?? 0)}
          columns={[
            {
              title: 'Guest',
              key: 'guest',
              render: (_: any, entry: any) => guestName(entry),
            },
            {
              title: 'Phone',
              key: 'phone',
              render: (_: any, entry: any) => entry.guestPhone ?? entry.diner?.phone ?? '—',
            },
            { title: 'Party', dataIndex: 'partySize' },
            {
              title: 'Source',
              dataIndex: 'source',
              render: (s: string) => (
                <Tag color={s === 'in_house' ? 'purple' : 'geekblue'}>
                  {s === 'in_house' ? 'In-house' : 'Online'}
                </Tag>
              ),
            },
            {
              title: 'Quoted wait',
              dataIndex: 'quotedWaitMinutes',
              render: (v: number | null) => (v != null ? `${v} min` : '—'),
            },
            { title: 'Date', dataIndex: 'preferredDate' },
            { title: 'Window', dataIndex: 'preferredTimeStart' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => (
                <Tag color={STATUS_COLORS[s] ?? 'default'}>{s.toUpperCase()}</Tag>
              ),
            },
            {
              title: 'Joined',
              dataIndex: 'createdAt',
              render: (v: string) => new Date(v).toLocaleString(),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: any, entry: any) => {
                const terminal = ['seated', 'cancelled', 'expired'].includes(entry.status);
                if (terminal) return null;
                return (
                  <Space size={4}>
                    {entry.status === 'waiting' && (
                      <Button
                        size="small"
                        loading={updating}
                        onClick={() => handleStatusChange(entry.id, 'notified')}
                      >
                        Notify
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="primary"
                      loading={updating}
                      onClick={() => handleStatusChange(entry.id, 'seated')}
                    >
                      Seat
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={updating}
                      onClick={() => handleStatusChange(entry.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal
        title="Add walk-in"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Add to waitlist"
        confirmLoading={adding}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddWalkIn}
          initialValues={{ partySize: 2 }}
        >
          <Form.Item name="guestName" label="Guest name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Jane Smith" />
          </Form.Item>
          <Form.Item name="guestPhone" label="Phone" rules={usPhoneRules()}>
            <PhoneInput placeholder="Optional" />
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
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistPageContent />
    </Suspense>
  );
}
