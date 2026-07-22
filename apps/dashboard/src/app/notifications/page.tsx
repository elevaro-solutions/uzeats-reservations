'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { PageHeader } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  RESTAURANT_TEAM,
  UPDATE_NOTIFICATION_PREFERENCES,
} from '@/lib/graphql';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Text } = Typography;

type ChannelKey = 'sms' | 'email' | 'webPush' | 'platform';

type EventKey =
  | 'newMessage'
  | 'newReservation'
  | 'waitlistAvailable'
  | 'guestSpendAlert'
  | 'reservationUpdates'
  | 'reviewReply'
  | 'surveyInvitation'
  | 'loyaltyUpdates';

type ChannelPrefs = Record<ChannelKey, boolean>;
type NotificationPreferences = Record<EventKey, ChannelPrefs>;

type TeamUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  notificationPreferences: NotificationPreferences;
};

const CHANNELS: Array<{ key: ChannelKey; title: string }> = [
  { key: 'sms', title: 'SMS' },
  { key: 'email', title: 'Email' },
  { key: 'webPush', title: 'Web push' },
  { key: 'platform', title: 'Platform' },
];

const EVENTS: Array<{ key: EventKey; title: string; hint: string }> = [
  { key: 'newMessage', title: 'New message', hint: 'Guest chats' },
  { key: 'newReservation', title: 'New reservation', hint: 'Incoming bookings' },
  { key: 'waitlistAvailable', title: 'Waitlist available', hint: 'Table ready / slot opened' },
  { key: 'guestSpendAlert', title: 'Spend alert', hint: 'High guest checks' },
  { key: 'reservationUpdates', title: 'Reservation updates', hint: 'Confirmations & reminders' },
  { key: 'reviewReply', title: 'Review reply', hint: 'Replies on guest reviews' },
  { key: 'surveyInvitation', title: 'Survey invite', hint: 'Post-visit feedback' },
  { key: 'loyaltyUpdates', title: 'Loyalty points', hint: 'Earned, redeemed, and refunded points' },
];

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner: 'Owner',
  staff: 'Staff',
  admin: 'Admin',
  diner: 'Diner',
};

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'restaurant_owner', label: 'Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

function displayName(u: TeamUser) {
  return `${u.firstName} ${u.lastName}`.trim();
}

/** Strip Apollo `__typename` so the draft is valid GraphQL input. */
function toPreferencesInput(prefs: NotificationPreferences): NotificationPreferences {
  const input = {} as NotificationPreferences;
  for (const event of EVENTS) {
    const channels = prefs[event.key] ?? {};
    input[event.key] = {
      sms: !!channels.sms,
      email: !!channels.email,
      webPush: !!channels.webPush,
      platform: !!channels.platform,
    };
  }
  return input;
}

export default function NotificationsSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurantIds = useMemo(
    () => (restData?.myRestaurants ?? []).map((r: { id: string }) => r.id),
    [restData],
  );
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const { data, loading, refetch } = useQuery(RESTAURANT_TEAM, {
    skip: !restaurantId,
    variables: { restaurantId },
    onError: (err: Error) => message.error(err.message),
  });
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<TeamUser | null>(null);
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const canManageTeam = user?.role === 'admin' || user?.role === 'restaurant_owner';
  const team: TeamUser[] = data?.restaurantTeam ?? [];

  const visibleTeam = useMemo(() => {
    let list = team;
    if (!canManageTeam && user) {
      list = list.filter((u) => u.id === user.id);
    }
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter);
    }
    return list;
  }, [team, canManageTeam, user, roleFilter]);

  const openEditor = (member: TeamUser) => {
    setSelected(member);
    setDraft(toPreferencesInput(member.notificationPreferences));
  };

  const closeEditor = () => {
    setSelected(null);
    setDraft(null);
  };

  const handleToggle = (event: EventKey, channel: ChannelKey, enabled: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [event]: {
          ...prev[event],
          [channel]: enabled,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!restaurantId || !selected || !draft) return;

    const isSelf = selected.id === user?.id;
    if (!isSelf && !canManageTeam) {
      message.error('Only owners can update team notification preferences');
      return;
    }

    setSaving(true);
    try {
      await updatePrefs({
        variables: {
          userId: selected.id,
          restaurantId,
          input: toPreferencesInput(draft),
        },
      });
      message.success(`Saved notification settings for ${displayName(selected)}`);
      await refetch();
      closeEditor();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const matrixRows = EVENTS.map((event) => ({
    key: event.key,
    event,
  }));

  return (
    <div component="NotificationsSettingsPage" style={{ display: 'contents' }}><Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <PageHeader
        title="Notifications"
        subtitle="Select a team member to configure feature alerts by channel."
        extra={
          <Select
            style={{ width: 260 }}
            value={restaurantId}
            onChange={setRestaurantId}
            options={(restData?.myRestaurants ?? []).map((r: { id: string; name: string }) => ({
              value: r.id,
              label: r.name,
            }))}
            placeholder="Select restaurant"
          />
        }
      />

      <Card className="rt-surface-card">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {canManageTeam && (
            <Space wrap>
              <Text type="secondary">Filter by role</Text>
              <Select
                style={{ width: 180 }}
                value={roleFilter}
                onChange={setRoleFilter}
                options={ROLE_FILTER_OPTIONS}
              />
            </Space>
          )}

          <Table<TeamUser>
            loading={loading}
            rowKey="id"
            dataSource={visibleTeam}
            pagination={false}
            locale={{ emptyText: 'No matching team members.' }}
            columns={[
              {
                title: 'User',
                render: (_: unknown, record) => (
                  <div>
                    <Text strong>
                      {displayName(record)}
                      {record.id === user?.id ? (
                        <Text type="secondary" style={{ fontWeight: 400 }}>
                          {' '}
                          (you)
                        </Text>
                      ) : null}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.email || record.phone || '—'}
                      </Text>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Role',
                dataIndex: 'role',
                width: 140,
                render: (role: string) => <Tag>{ROLE_LABELS[role] ?? role}</Tag>,
              },
              {
                title: 'Settings',
                width: 180,
                align: 'right',
                render: (_: unknown, record) => (
                  <Button
                    type="primary"
                    ghost
                    icon={<SettingOutlined />}
                    onClick={() => openEditor(record)}
                  >
                    Configure
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Modal
        open={!!selected && !!draft}
        title={
          selected
            ? `Notifications — ${displayName(selected)}`
            : 'Notification settings'
        }
        onCancel={closeEditor}
        onOk={handleSave}
        okText="Save"
        confirmLoading={saving}
        width={820}
        destroyOnClose
      >
        {selected && (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Tag>{ROLE_LABELS[selected.role] ?? selected.role}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Rows are alert features. Columns are delivery channels. Password reset emails are
                always sent.
              </Text>
            </div>

            <Table
              size="small"
              pagination={false}
              rowKey="key"
              dataSource={matrixRows}
              columns={[
                {
                  title: 'Feature',
                  width: 220,
                  render: (_: unknown, row: (typeof matrixRows)[number]) => (
                    <div>
                      <Text strong>{row.event.title}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {row.event.hint}
                        </Text>
                      </div>
                    </div>
                  ),
                },
                ...CHANNELS.map((channel) => ({
                  title: channel.title,
                  key: channel.key,
                  align: 'center' as const,
                  width: 110,
                  render: (_: unknown, row: (typeof matrixRows)[number]) => {
                    const checked = draft?.[row.event.key]?.[channel.key] ?? false;
                    return (
                      <Switch
                        checked={checked}
                        onChange={(enabled) =>
                          handleToggle(row.event.key, channel.key, enabled)
                        }
                        aria-label={`${row.event.title} via ${channel.title}`}
                      />
                    );
                  },
                })),
              ]}
            />
          </Space>
        )}
      </Modal>
    </Space></div>
  );
}
