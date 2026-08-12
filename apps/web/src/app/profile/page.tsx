'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Card, List, Space, Spin, Switch, Tag, Typography, message } from 'antd';
import {
  BellOutlined,
  CheckCircleFilled,
  HeartOutlined,
  MailOutlined,
  MessageOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { PageHeader, colors, radii, shadows } from '@reservations/ui';
import { LOYALTY, loyaltyRedeemProgress, resolveLoyaltyTier, buildRestaurantBookingPath } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UPDATE_NOTIFICATION_PREFERENCES } from '@/lib/graphql';

const { Title, Text } = Typography;

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

const MY_RESTAURANT_LOYALTY = gql`
  query MyRestaurantLoyalty {
    myRestaurantLoyalty {
      restaurantId
      restaurantName
      restaurantSlug
      points
    }
    myRestaurantLoyaltyHistory(limit: 20) {
      id
      restaurantId
      restaurantName
      type
      points
      description
      createdAt
    }
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
  const { data: restaurantLoyaltyData } = useQuery(MY_RESTAURANT_LOYALTY, { skip: !user });
  const [registerPush] = useMutation(REGISTER_PUSH);
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPref, setPushPref] = useState(false);
  const [availabilityAlerts, setAvailabilityAlerts] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  useEffect(() => {
    if (pushSubscription) setPushPref(true);
  }, [pushSubscription]);

  useEffect(() => {
    const prefs = user?.notificationPreferences?.availabilityAlerts;
    if (!prefs) {
      setAvailabilityAlerts(true);
      return;
    }
    const explicitOff =
      prefs.email === false && prefs.webPush === false && prefs.platform === false;
    setAvailabilityAlerts(!explicitOff);
  }, [user?.notificationPreferences?.availabilityAlerts]);

  useEffect(() => {
    const reservationSms = user?.notificationPreferences?.reservationUpdates?.sms;
    const waitlistSms = user?.notificationPreferences?.waitlistAvailable?.sms;
    const availabilitySms = user?.notificationPreferences?.availabilityAlerts?.sms;
    setSmsAlerts(Boolean(reservationSms || waitlistSms || availabilitySms));
  }, [user?.notificationPreferences]);

  const persistSmsAlerts = useCallback(
    async (enabled: boolean) => {
      setSmsLoading(true);
      setSmsAlerts(enabled);
      try {
        await updatePrefs({
          variables: {
            input: {
              reservationUpdates: { sms: enabled },
              waitlistAvailable: { sms: enabled },
              availabilityAlerts: { sms: enabled },
            },
          },
        });
        await refreshMe();
        message.success(enabled ? 'SMS alerts enabled' : 'SMS alerts turned off');
      } catch (err) {
        setSmsAlerts(!enabled);
        message.error(err instanceof Error ? err.message : 'Could not update SMS preferences');
      } finally {
        setSmsLoading(false);
      }
    },
    [updatePrefs, refreshMe],
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').then((reg) => {
      void reg.pushManager.getSubscription().then((sub) => {
        setPushSubscription(sub);
      });
    });
  }, []);

  const persistPushPref = useCallback(
    async (enabled: boolean) => {
      setPushPref(enabled);
      await updatePrefs({
        variables: { input: { reservationUpdates: { webPush: enabled } } },
      });
      await refreshMe();
    },
    [updatePrefs, refreshMe],
  );

  const persistAvailabilityAlerts = useCallback(
    async (enabled: boolean) => {
      setAvailabilityLoading(true);
      setAvailabilityAlerts(enabled);
      try {
        await updatePrefs({
          variables: {
            input: {
              availabilityAlerts: {
                email: enabled,
                webPush: enabled,
                platform: enabled,
              },
            },
          },
        });
        await refreshMe();
        message.success(
          enabled
            ? 'You’ll get alerts when tables open at your favorites'
            : 'Availability alerts turned off',
        );
      } catch (err) {
        setAvailabilityAlerts(!enabled);
        message.error(err instanceof Error ? err.message : 'Could not update preferences');
      } finally {
        setAvailabilityLoading(false);
      }
    },
    [updatePrefs, refreshMe],
  );

  const subscribeToPush = useCallback(async () => {
    setPushLoading(true);
    try {
      await persistPushPref(true);
      if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('Notification' in window)) {
        message.success('Push notifications enabled for this account');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        message.warning('Browser permission denied — you will still get in-app alerts');
        return;
      }
      const ready = await navigator.serviceWorker.ready;
      const subscription = await (ready ?? registration).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      setPushSubscription(subscription);
      await registerPush({
        variables: { token: JSON.stringify(subscription.toJSON()), platform: 'web' },
      });
      message.success('Push notifications enabled');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to enable push notifications');
    } finally {
      setPushLoading(false);
    }
  }, [persistPushPref, registerPush]);

  const unsubscribeFromPush = useCallback(async () => {
    setPushLoading(true);
    try {
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        setPushSubscription(null);
      }
      await persistPushPref(false);
      message.success('Push notifications disabled');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to disable push notifications');
    } finally {
      setPushLoading(false);
    }
  }, [pushSubscription, persistPushPref]);

  if (authLoading) {
    return (
      <div component="ProfilePage" style={{ display: 'contents' }}>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace('/login?next=/profile');
    return null;
  }

  const redeemProgress = loyaltyRedeemProgress(user?.loyaltyPoints ?? 0);
  const tier = resolveLoyaltyTier(user?.loyaltyCompletedVisits ?? 0);
  const restaurantBalances = (restaurantLoyaltyData as any)?.myRestaurantLoyalty ?? [];
  const restaurantHistory = (restaurantLoyaltyData as any)?.myRestaurantLoyaltyHistory ?? [];

  return (
    <div component="ProfilePage" style={{ display: 'contents' }}><Space orientation="vertical" size={20} style={{ width: '100%', maxWidth: 720 }}>
      <PageHeader
        title="Profile"
        subtitle="Manage notifications and loyalty rewards"
      />

      <Card
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
          background: `linear-gradient(135deg, ${colors.surface} 60%, ${colors.brand[50]} 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: colors.brand[100],
              color: colors.brand[700],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user?.firstName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Title level={4} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text type="secondary">{user?.email}</Text>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: colors.surface,
              border: `1px solid ${colors.brand[100]}`,
              borderRadius: radii.pill,
              padding: '8px 16px',
            }}
          >
            <TrophyOutlined style={{ color: colors.brand[600] }} />
            <Text strong style={{ color: colors.brand[700], fontSize: 16 }}>
              {user?.loyaltyPoints ?? 0}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              points
            </Text>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{
            height: 8,
            borderRadius: radii.pill,
            background: colors.brand[100],
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${redeemProgress.percent}%`,
              height: '100%',
              background: colors.brand[600],
              borderRadius: radii.pill,
            }} />
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            {redeemProgress.canRedeem
              ? `Ready to redeem (${LOYALTY.MIN_REDEEM_POINTS}+ pts)`
              : `${redeemProgress.remaining} pts until you can redeem`}
          </Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            Tier: <Text strong>{user?.loyaltyTierName ?? tier.name}</Text>
            {tier.visitsToNextTier != null
              ? ` · ${tier.visitsToNextTier} visits to ${tier.nextTier?.name}`
              : ' · top tier'}
          </Text>
          {user?.referralCode && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              Referral code: <Text strong copyable>{user.referralCode}</Text>
            </Text>
          )}
          {user?.loyaltyPointsExpireAt && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              Points expire: {new Date(user.loyaltyPointsExpireAt).toLocaleDateString()}
            </Text>
          )}
        </div>
      </Card>

      {(restaurantBalances.length > 0 || restaurantHistory.length > 0) && (
        <Card
          title="Restaurant rewards"
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.bordersubtle}`,
            boxShadow: shadows.sm,
          }}
        >
          {restaurantBalances.length > 0 && (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Points you can redeem at specific restaurants when booking.
              </Text>
              <List
                dataSource={restaurantBalances}
                renderItem={(item: {
                  restaurantId: string;
                  restaurantName: string;
                  restaurantSlug?: string | null;
                  points: number;
                }) => (
                  <List.Item
                    actions={[
                      <Link
                        key="book"
                        href={buildRestaurantBookingPath(item.restaurantSlug, item.restaurantId)}
                      >
                        Book
                      </Link>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.restaurantName}
                      description={`${item.points} points available`}
                    />
                  </List.Item>
                )}
              />
            </>
          )}
          {restaurantHistory.length > 0 && (
            <div style={{ marginTop: restaurantBalances.length > 0 ? 16 : 0 }}>
              <Title level={5} style={{ marginTop: 0 }}>
                Restaurant activity
              </Title>
              {restaurantHistory.map((item: any, idx: number, arr: any[]) => (
                <div
                  key={item.id ?? idx}
                  style={{
                    padding: '12px 0',
                    borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
                  }}
                >
                  <Text strong style={{ color: item.points > 0 ? colors.success : colors.textPrimary }}>
                    {item.points > 0 ? '+' : ''}
                    {item.points} · {item.restaurantName}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                    {item.description}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card
        id="notifications"
        title="Notification preferences"
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
        }}
      >
        <List>
          <List.Item
            extra={<Tag icon={<CheckCircleFilled />} color="success">Always on</Tag>}
          >
            <List.Item.Meta
              avatar={<MailOutlined style={{ fontSize: 20, color: colors.brand[600] }} />}
              title="Email"
              description="Reservation confirmations, reminders, and updates"
            />
          </List.Item>

          <List.Item
            extra={
              <Switch
                checked={smsAlerts}
                loading={smsLoading}
                onChange={(checked) => void persistSmsAlerts(checked)}
                style={smsAlerts ? { background: colors.brand[600] } : undefined}
              />
            }
          >
            <List.Item.Meta
              avatar={<MessageOutlined style={{ fontSize: 20, color: colors.brand[600] }} />}
              title="SMS text messages"
              description={
                <>
                  Transactional texts for reservations and waitlist alerts. Msg &amp; data rates may
                  apply. Reply STOP to cancel.{' '}
                  <Link href="/sms">SMS Terms</Link>
                </>
              }
            />
          </List.Item>

          <List.Item
            extra={
              <Switch
                checked={pushPref || Boolean(pushSubscription)}
                loading={pushLoading}
                onChange={(checked) => {
                  if (checked) void subscribeToPush();
                  else void unsubscribeFromPush();
                }}
                style={pushPref || pushSubscription ? { background: colors.brand[600] } : undefined}
              />
            }
          >
            <List.Item.Meta
              avatar={<BellOutlined style={{ fontSize: 20, color: colors.brand[600] }} />}
              title="Push notifications"
              description={
                pushPermission === 'denied'
                  ? 'Permission denied — enable notifications in browser settings'
                  : pushPref || pushSubscription
                    ? 'You will receive reservation updates in this browser when allowed'
                    : 'Get notified about reservation updates in your browser'
              }
            />
          </List.Item>

          <List.Item
            extra={
              <Switch
                checked={availabilityAlerts}
                loading={availabilityLoading}
                onChange={(checked) => void persistAvailabilityAlerts(checked)}
                style={availabilityAlerts ? { background: colors.brand[600] } : undefined}
              />
            }
          >
            <List.Item.Meta
              avatar={<HeartOutlined style={{ fontSize: 20, color: colors.brand[600] }} />}
              title="Favorite table alerts"
              description="When someone cancels at a restaurant you favorited (within 48 hours), we’ll nudge you to book the opening"
            />
          </List.Item>
        </List>
      </Card>

      <Card
        title="Loyalty history"
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
        }}
      >
        {((data as any)?.myLoyalty ?? []).length === 0 && (
          <Text type="secondary">No loyalty activity yet — book a table to start earning points.</Text>
        )}
        {((data as any)?.myLoyalty ?? []).map((item: any, idx: number, arr: any[]) => (
          <div
            key={item.id ?? idx}
            style={{
              padding: '12px 0',
              borderBottom: idx < arr.length - 1 ? `1px solid ${colors.bordersubtle}` : 'none',
            }}
          >
            <Text strong style={{ color: item.points > 0 ? colors.success : colors.textPrimary }}>
              {item.points > 0 ? '+' : ''}
              {item.points} · {item.description}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </div>
        ))}
      </Card>
    </Space></div>
  );
}
