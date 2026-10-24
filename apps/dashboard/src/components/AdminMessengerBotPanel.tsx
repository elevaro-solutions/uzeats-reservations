'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ADMIN_CONNECT_TELEGRAM_BOT,
  ADMIN_DISCONNECT_TELEGRAM_BOT,
  ADMIN_MESSENGER_BOT,
  ADMIN_MESSENGER_BOT_RESTAURANTS,
  ADMIN_SET_RESTAURANT_MESSENGER_BOT,
  ADMIN_UPDATE_MESSENGER_BOT,
} from '@/lib/graphql';

const { Text, Paragraph } = Typography;

type RestaurantBotRow = {
  restaurantId: string;
  name: string;
  access: string;
  enabled: boolean;
  available: boolean;
  active: boolean;
  feeOverrideCents?: number | null;
  effectiveFeeCents: number;
  estimatedChargeCents: number;
  linkedChatCount: number;
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    (cents || 0) / 100,
  );
}

export function AdminMessengerBotPanel() {
  const { data, loading, refetch } = useQuery(ADMIN_MESSENGER_BOT);
  const { data: restData, refetch: refetchRestaurants } = useQuery(ADMIN_MESSENGER_BOT_RESTAURANTS, {
    variables: { page: 1, pageSize: 50 },
  });
  const [updateBot, { loading: saving }] = useMutation(ADMIN_UPDATE_MESSENGER_BOT);
  const [connectBot, { loading: connecting }] = useMutation(ADMIN_CONNECT_TELEGRAM_BOT);
  const [disconnectBot, { loading: disconnecting }] = useMutation(ADMIN_DISCONNECT_TELEGRAM_BOT);
  const [setRestaurant] = useMutation(ADMIN_SET_RESTAURANT_MESSENGER_BOT);

  const [botToken, setBotToken] = useState('');
  const bot = data?.adminMessengerBot;
  const restaurants: RestaurantBotRow[] =
    restData?.adminMessengerBotRestaurants?.restaurants ?? [];

  const persist = async (input: Record<string, unknown>) => {
    try {
      await updateBot({ variables: { input } });
      message.success('Messenger bot settings saved');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleConnect = async () => {
    try {
      await connectBot({ variables: { botToken } });
      message.success('Telegram bot connected');
      setBotToken('');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not connect bot');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectBot();
      message.success('Telegram bot disconnected');
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  const handleRestaurantAccess = async (
    restaurantId: string,
    patch: Record<string, unknown>,
  ) => {
    try {
      await setRestaurant({ variables: { input: { restaurantId, ...patch } } });
      await refetchRestaurants();
      await refetch();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update restaurant');
    }
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card loading={loading} title="Merchant Telegram messenger bot">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Connect one BotFather token for reservation Accept / Reject / Seat / Complete alerts.
            Fees roll into each restaurant&apos;s monthly invoice.
          </Paragraph>

          <Space wrap align="center">
            <Text>Platform enabled</Text>
            <Switch
              checked={Boolean(bot?.enabled)}
              loading={saving}
              onChange={(enabled) => persist({ enabled })}
            />
            {bot?.telegramConnected ? (
              <Tag color="green">@{bot.telegramBotUsername}</Tag>
            ) : (
              <Tag>Not connected</Tag>
            )}
            <Tag>{bot?.transport?.mode ?? 'NONE'}</Tag>
            <Text type="secondary">
              {bot?.activeRestaurantCount ?? 0} active · {bot?.linkedChatCount ?? 0} chats
            </Text>
          </Space>

          <Space wrap>
            <Select
              style={{ width: 180 }}
              value={bot?.availability ?? 'SELECTED'}
              options={[
                { value: 'ALL', label: 'All restaurants' },
                { value: 'SELECTED', label: 'Selected only' },
              ]}
              onChange={(availability) => persist({ availability })}
            />
            <Select
              style={{ width: 200 }}
              value={bot?.feePricingMode ?? 'PER_RESTAURANT'}
              options={[
                { value: 'PER_RESTAURANT', label: 'Fee per restaurant' },
                { value: 'PER_ACCOUNT', label: 'Fee per linked chat' },
              ]}
              onChange={(feePricingMode) => persist({ feePricingMode })}
            />
            <InputNumber
              min={0}
              step={100}
              addonBefore="$"
              value={(bot?.feeMonthlyCents ?? 0) / 100}
              onChange={(v) =>
                persist({ feeMonthlyCents: Math.round(Number(v || 0) * 100) })
              }
            />
          </Space>

          <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
            <Input
              placeholder="BotFather token (123456:ABC…)"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              type="password"
            />
            <Button type="primary" loading={connecting} onClick={handleConnect}>
              Connect
            </Button>
            <Button danger loading={disconnecting} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      <Card title="Restaurant access">
        <Table<RestaurantBotRow>
          size="small"
          rowKey="restaurantId"
          dataSource={restaurants}
          pagination={false}
          columns={[
            {
              title: 'Restaurant',
              dataIndex: 'name',
            },
            {
              title: 'Access',
              width: 160,
              render: (_value, row) => (
                <Select
                  size="small"
                  style={{ width: 140 }}
                  value={row.access}
                  options={[
                    { value: 'DEFAULT', label: 'Default' },
                    { value: 'ENABLED', label: 'Enabled' },
                    { value: 'DISABLED', label: 'Disabled' },
                  ]}
                  onChange={(access) => handleRestaurantAccess(row.restaurantId, { access })}
                />
              ),
            },
            {
              title: 'On',
              width: 70,
              render: (_value, row) => (
                <Switch
                  size="small"
                  checked={row.enabled}
                  onChange={(enabled) => handleRestaurantAccess(row.restaurantId, { enabled })}
                />
              ),
            },
            {
              title: 'Fee',
              width: 120,
              render: (_value, row) => money(row.estimatedChargeCents || row.effectiveFeeCents),
            },
            {
              title: 'Chats',
              dataIndex: 'linkedChatCount',
              width: 70,
            },
            {
              title: 'Active',
              width: 80,
              render: (_value, row) =>
                row.active ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
