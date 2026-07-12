'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Empty,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/lib/auth';
import { MY_WAITLIST, CANCEL_WAITLIST, RESTAURANT_DETAIL } from '@/lib/graphql';

const { Title, Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  waiting: { color: 'processing', icon: <ClockCircleOutlined />, label: 'Waiting' },
  notified: { color: 'success', icon: <CheckCircleOutlined />, label: 'Notified' },
  expired: { color: 'default', icon: <ExclamationCircleOutlined />, label: 'Expired' },
  cancelled: { color: 'error', icon: <CloseCircleOutlined />, label: 'Cancelled' },
};

export default function WaitlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data, loading, refetch } = useQuery(MY_WAITLIST, { skip: !user });
  const [cancelWaitlist] = useMutation(CANCEL_WAITLIST);

  if (!authLoading && !user) {
    router.replace('/login?next=/waitlist');
    return null;
  }

  const entries = (data as any)?.myWaitlist ?? [];

  const handleCancel = (id: string) => {
    Modal.confirm({
      title: 'Cancel waitlist entry?',
      content: 'You will lose your spot and will need to rejoin the waitlist.',
      okText: 'Yes, cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await cancelWaitlist({ variables: { id } });
          message.success('Waitlist entry cancelled');
          refetch();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to cancel');
        }
      },
    });
  };

  const handleBookNow = (entry: any) => {
    const params = new URLSearchParams({
      date: dayjs(entry.preferredDate).format('YYYY-MM-DD'),
      party: String(entry.partySize),
      ...(entry.notifiedSlot ? { slot: entry.notifiedSlot } : {}),
    });
    router.push(`/restaurants/${entry.restaurantId}?${params.toString()}`);
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%', maxWidth: 800 }}>
      <Title level={2}>My Waitlist</Title>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <Empty
            description="You're not on any waitlists yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => router.push('/')}>
              Find restaurants
            </Button>
          </Empty>
        </Card>
      ) : (
        <List
          dataSource={entries}
          renderItem={(entry: any) => {
            const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting;
            return (
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <WaitlistRestaurantName restaurantId={entry.restaurantId} />
                      <Tag icon={cfg.icon} color={cfg.color}>
                        {cfg.label}
                      </Tag>
                    </div>

                    <Space size={16} wrap>
                      <Text type="secondary">
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {dayjs(entry.preferredDate).format('MMM D, YYYY')}
                        {entry.preferredTimeStart && (
                          <> · {entry.preferredTimeStart}–{entry.preferredTimeEnd}</>
                        )}
                      </Text>
                      <Text type="secondary">
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {entry.partySize} {entry.partySize === 1 ? 'guest' : 'guests'}
                      </Text>
                    </Space>

                    {entry.notifiedSlot && entry.status === 'notified' && (
                      <div style={{ marginTop: 8 }}>
                        <Tag color="#da3743">Slot available: {entry.notifiedSlot}</Tag>
                      </div>
                    )}

                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Joined {dayjs(entry.createdAt).format('MMM D, YYYY [at] h:mm A')}
                      </Text>
                    </div>
                  </div>

                  <Space direction="vertical" size={8}>
                    {entry.status === 'notified' && (
                      <Button type="primary" onClick={() => handleBookNow(entry)}>
                        Book Now
                      </Button>
                    )}
                    {entry.status === 'waiting' && (
                      <Button danger onClick={() => handleCancel(entry.id)}>
                        Cancel
                      </Button>
                    )}
                  </Space>
                </div>
              </Card>
            );
          }}
        />
      )}
    </Space>
  );
}

function WaitlistRestaurantName({ restaurantId }: { restaurantId: string }) {
  const { data } = useQuery(RESTAURANT_DETAIL, {
    variables: { id: restaurantId },
  });

  return (
    <Text strong style={{ fontSize: 16 }}>
      {(data as any)?.restaurant?.name ?? `Restaurant #${restaurantId.slice(-6)}`}
    </Text>
  );
}
