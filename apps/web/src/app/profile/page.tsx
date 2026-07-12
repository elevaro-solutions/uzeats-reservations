'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Button, Card, Form, Input, List, Space, Switch, Tag, Typography, message } from 'antd';
import {
  BellOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LinkOutlined,
  MailOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

const MY_LOYALTY = gql`
  query MyLoyalty {
    myLoyalty {
      id
      type
      points
      description
      createdAt
    }
  }
`;

const LINK_TELEGRAM = gql`
  mutation LinkTelegram($chatId: String!) {
    linkTelegram(chatId: $chatId)
  }
`;

const REGISTER_PUSH = gql`
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshMe } = useAuth();
  const router = useRouter();
  const { data } = useQuery(MY_LOYALTY, { skip: !user });
  const [linkTelegram] = useMutation(LINK_TELEGRAM);
  const [registerPush] = useMutation(REGISTER_PUSH);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscription(sub);
        });
      });
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      message.warning('Push notifications are not configured on this server');
      return;
    }
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        message.warning('Notification permission denied');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      setPushSubscription(subscription);
      await registerPush({
        variables: { token: JSON.stringify(subscription.toJSON()), platform: 'web' },
      });
      message.success('Push notifications enabled');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setPushLoading(false);
    }
  }, [registerPush]);

  const unsubscribeFromPush = useCallback(async () => {
    if (pushSubscription) {
      await pushSubscription.unsubscribe();
      setPushSubscription(null);
      message.success('Push notifications disabled');
    }
  }, [pushSubscription]);

  if (!authLoading && !user) {
    router.replace('/login?next=/profile');
    return null;
  }

  const telegramLinked = !!(user as any)?.telegramChatId;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 720 }}>
      <Title level={2}>Profile</Title>
      <Card>
        <Title level={4} style={{ marginTop: 0 }}>
          {user?.firstName} {user?.lastName}
        </Title>
        <Text type="secondary">{user?.email}</Text>
        <div style={{ marginTop: 12 }}>
          <Text strong>Loyalty points: </Text>
          <Text style={{ color: '#da3743', fontWeight: 600 }}>{user?.loyaltyPoints ?? 0}</Text>
        </div>
      </Card>

      <Card title="Notification preferences">
        <List>
          <List.Item
            extra={<Tag icon={<CheckCircleFilled />} color="success">Always on</Tag>}
          >
            <List.Item.Meta
              avatar={<MailOutlined style={{ fontSize: 20, color: '#da3743' }} />}
              title="Email"
              description="Reservation confirmations, reminders, and updates"
            />
          </List.Item>

          <List.Item
            extra={
              telegramLinked ? (
                <Tag icon={<CheckCircleFilled />} color="success">Linked</Tag>
              ) : (
                <Tag icon={<CloseCircleFilled />} color="default">Not linked</Tag>
              )
            }
          >
            <List.Item.Meta
              avatar={<SendOutlined style={{ fontSize: 20, color: '#da3743' }} />}
              title="Telegram"
              description={
                telegramLinked
                  ? 'Receiving instant notifications via Telegram'
                  : 'Link your Telegram to get instant notifications'
              }
            />
          </List.Item>

          <List.Item
            extra={
              pushSubscription ? (
                <Switch
                  checked
                  onChange={unsubscribeFromPush}
                  style={{ background: '#da3743' }}
                />
              ) : (
                <Switch
                  checked={false}
                  loading={pushLoading}
                  onChange={subscribeToPush}
                />
              )
            }
          >
            <List.Item.Meta
              avatar={<BellOutlined style={{ fontSize: 20, color: '#da3743' }} />}
              title="Push notifications"
              description={
                !VAPID_PUBLIC_KEY
                  ? 'Push notifications are not configured on this server'
                  : pushPermission === 'denied'
                    ? 'Permission denied — enable notifications in browser settings'
                    : pushSubscription
                      ? 'Receiving push notifications in this browser'
                      : 'Get notified about reservation updates in your browser'
              }
            />
          </List.Item>
        </List>

        {!telegramLinked && (
          <Card
            size="small"
            style={{
              marginTop: 16,
              background: '#faf5f5',
              border: '1px solid #f0e0e0',
            }}
          >
            <Title level={5} style={{ marginTop: 0 }}>
              <SendOutlined style={{ marginRight: 8 }} />
              Link Telegram
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              1. Open{' '}
              <a
                href="https://t.me/ReserveTableBot"
                target="_blank"
                rel="noopener noreferrer"
              >
                @ReserveTableBot <LinkOutlined />
              </a>{' '}
              in Telegram
              <br />
              2. Send <Text code>/start</Text> to the bot
              <br />
              3. The bot will reply with your Chat ID — paste it below
            </Paragraph>
            <Form
              layout="inline"
              onFinish={async (values) => {
                try {
                  await linkTelegram({ variables: { chatId: values.chatId } });
                  message.success('Telegram linked successfully');
                  refreshMe();
                } catch (err) {
                  message.error(err instanceof Error ? err.message : 'Failed to link Telegram');
                }
              }}
            >
              <Form.Item
                name="chatId"
                rules={[{ required: true, message: 'Enter your Telegram chat ID' }]}
              >
                <Input placeholder="e.g. 123456789" style={{ width: 200 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Link
              </Button>
            </Form>
          </Card>
        )}
      </Card>

      <Card title="Loyalty history">
        {((data as any)?.myLoyalty ?? []).length === 0 && (
          <Text type="secondary">No loyalty activity yet</Text>
        )}
        {((data as any)?.myLoyalty ?? []).map((item: any, idx: number, arr: any[]) => (
          <div
            key={item.id ?? idx}
            style={{
              padding: '12px 0',
              borderBottom: idx < arr.length - 1 ? '1px solid #f1efed' : 'none',
            }}
          >
            <Text strong>
              {item.points > 0 ? '+' : ''}
              {item.points} · {item.description}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </div>
        ))}
      </Card>
    </Space>
  );
}
