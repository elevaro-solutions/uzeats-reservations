'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
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
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, EmptyState, colors, radii, shadows } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { MY_WAITLIST, CANCEL_WAITLIST, RESTAURANT_DETAIL } from '@/lib/graphql';

const { Text } = Typography;

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
    <div style={{ maxWidth: 800 }}>
      <PageHeader
        title="My waitlist"
        subtitle="We'll notify you when a table opens"
        extra={
          <Button type="primary" icon={<SearchOutlined />} onClick={() => router.push('/')}>
            Find restaurants
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ClockCircleOutlined />}
          title="You're not on any waitlists"
          description="When a restaurant is fully booked, join the waitlist and we'll alert you if a table frees up."
          action={
            <Button type="primary" size="large" onClick={() => router.push('/')}>
              Browse restaurants
            </Button>
          }
        />
      ) : (
        <List
          dataSource={entries}
          renderItem={(entry: any) => {
            const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting;
            return (
              <Card
                style={{
                  marginBottom: 12,
                  borderRadius: radii.lg,
                  border: `1px solid ${colors.bordersubtle}`,
                  boxShadow: shadows.sm,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
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
                          <>
                            {' '}
                            · {entry.preferredTimeStart}–{entry.preferredTimeEnd}
                          </>
                        )}
                      </Text>
                      <Text type="secondary">
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {entry.partySize} {entry.partySize === 1 ? 'guest' : 'guests'}
                      </Text>
                    </Space>

                    {entry.notifiedSlot && entry.status === 'notified' && (
                      <div style={{ marginTop: 10 }}>
                        <Tag
                          style={{
                            background: colors.brand[50],
                            color: colors.brand[700],
                            border: `1px solid ${colors.brand[200]}`,
                            borderRadius: radii.pill,
                          }}
                        >
                          Slot available: {entry.notifiedSlot}
                        </Tag>
                      </div>
                    )}

                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Joined {dayjs(entry.createdAt).format('MMM D, YYYY [at] h:mm A')}
                      </Text>
                    </div>
                  </div>

                  <Space direction="vertical" size={8}>
                    {entry.status === 'notified' && (
                      <Button type="primary" onClick={() => handleBookNow(entry)}>
                        Book now
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
    </div>
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
