'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckCircleFilled,
  HeartOutlined,
  EditOutlined,
  MailOutlined,
  RightOutlined,
  GiftFilled,
} from '@ant-design/icons';
import { PageHeader, AppStoreBadges, colors, radii, shadows, formatPhoneDisplay } from '@reservations/ui';
import { browserMediaUrl } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UPDATE_NOTIFICATION_PREFERENCES, DELETE_MY_ACCOUNT } from '@/lib/graphql';
import { formatDinerAddress, ProfileAccountModal } from '@/components/profile/ProfileAccountCard';
import { formatPoints, loyaltyTierClass } from '@/components/loyalty/loyaltyFormat';

const { Title, Text, Paragraph } = Typography;

const REGISTER_PUSH = gql`
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const WEB_PUSH_OPT_IN_KEY = 'rt-web-push-opt-in';

function readWebPushOptIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(WEB_PUSH_OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeWebPushOptIn(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(WEB_PUSH_OPT_IN_KEY, '1');
    else window.localStorage.removeItem(WEB_PUSH_OPT_IN_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

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
  const { user, loading: authLoading, refreshMe, logout } = useAuth();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT);
  const [registerPush] = useMutation(REGISTER_PUSH);
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPref, setPushPref] = useState(false);
  const [availabilityAlerts, setAvailabilityAlerts] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pushEnabled = pushPref || Boolean(pushSubscription);

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
    let cancelled = false;

    const restorePush = async () => {
      const optedIn = readWebPushOptIn();
      if (!cancelled) setPushPref(optedIn);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (!cancelled) setPushPermission(Notification.permission);
      }
      if (!('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const ready = await navigator.serviceWorker.ready;
        const existing = await (ready ?? reg).pushManager.getSubscription();
        if (cancelled) return;

        if (existing) {
          setPushSubscription(existing);
          setPushPref(true);
          writeWebPushOptIn(true);
          return;
        }

        // Re-subscribe when the diner opted in before but the browser lost the subscription.
        if (
          optedIn &&
          VAPID_PUBLIC_KEY &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          const subscription = await (ready ?? reg).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
          });
          if (cancelled) return;
          setPushSubscription(subscription);
          setPushPref(true);
          writeWebPushOptIn(true);
          await registerPush({
            variables: { token: JSON.stringify(subscription.toJSON()), platform: 'web' },
          });
        }
      } catch {
        /* SW / push unavailable — keep localStorage opt-in for the toggle */
      }
    };

    void restorePush();
    return () => {
      cancelled = true;
    };
  }, [registerPush]);

  const persistPushPref = useCallback(
    async (enabled: boolean) => {
      setPushPref(enabled);
      writeWebPushOptIn(enabled);
      await updatePrefs({
        variables: {
          input: {
            reservationUpdates: { webPush: enabled },
            waitlistAvailable: { webPush: enabled },
          },
        },
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
        message.success('Push preference saved on this device');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        message.warning('Browser permission denied — preference is still saved for when you allow notifications');
        return;
      }
      const ready = await navigator.serviceWorker.ready;
      const subscription = await (ready ?? registration).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      setPushSubscription(subscription);
      writeWebPushOptIn(true);
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

  return (
    <div component="ProfilePage" style={{ display: 'contents' }}><Space orientation="vertical" size={20} style={{ width: '100%', maxWidth: 720 }}>
      <PageHeader
        title="Profile"
        subtitle="Manage your account, notifications, and privacy"
      />

      <div className="rt-app-promo">
        <div className="rt-app-promo__copy">
          <strong>Get the Tablevera app</strong>
          <span>Android is on Google Play. iPhone is coming soon.</span>
        </div>
        <AppStoreBadges app="diner" tone="light" size="sm" />
      </div>

      <Card
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              background: colors.brand[100],
              color: colors.brand[700],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={browserMediaUrl(user.avatarUrl)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user?.firstName?.[0]?.toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Title level={4} style={{ margin: 0 }}>
              {user?.firstName} {user?.lastName}
            </Title>
            <Text type="secondary">{user?.email}</Text>
            {user?.phone ? (
              <Text type="secondary" style={{ display: 'block' }}>
                {formatPhoneDisplay(user.phone)}
              </Text>
            ) : null}
            {user?.address?.line1 ? (
              <Text type="secondary" style={{ display: 'block' }}>
                {formatDinerAddress(user.address)}
              </Text>
            ) : null}
          </div>
          <Button icon={<EditOutlined />} onClick={() => setAccountOpen(true)}>
            Edit
          </Button>
        </div>
        <Link
          href="/profile/loyalty"
          className={`rt-profile-loyalty-link ${loyaltyTierClass(user.loyaltyTier)}`}
        >
          <span className="rt-profile-loyalty-link__icon" aria-hidden>
            <GiftFilled />
          </span>
          <span className="rt-profile-loyalty-link__copy">
            <strong>
              {user.loyaltyTierName ?? 'Bronze'} · {formatPoints(user.loyaltyPoints ?? 0)} pts
            </strong>
            <span>Status, referrals, and points history</span>
          </span>
          <span className="rt-profile-loyalty-link__cta">
            <span className="rt-profile-loyalty-link__cta-label">Loyalty &amp; rewards</span>
            <RightOutlined aria-hidden />
          </span>
        </Link>
      </Card>

      <ProfileAccountModal
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onSaved={refreshMe}
      />

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
                checked={pushEnabled}
                loading={pushLoading}
                onChange={(checked) => {
                  if (checked) void subscribeToPush();
                  else void unsubscribeFromPush();
                }}
                style={pushEnabled ? { background: colors.brand[600] } : undefined}
              />
            }
          >
            <List.Item.Meta
              avatar={<BellOutlined style={{ fontSize: 20, color: colors.brand[600] }} />}
              title="Push notifications"
              description={
                pushPermission === 'denied'
                  ? 'Permission denied — enable notifications in browser settings'
                  : pushEnabled
                    ? pushSubscription
                      ? 'You will receive reservation updates in this browser when allowed'
                      : 'Saved on this device — allow browser notifications when prompted to finish setup'
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
        title="Danger zone"
        styles={{ header: { color: colors.error } }}
        style={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.bordersubtle}`,
          boxShadow: shadows.sm,
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Delete account</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Permanently removes your login and personal details. Past bookings stay for the
              restaurant as anonymous “Guest” visits (including no-shows), without your name or
              contact info. Upcoming reservations are cancelled. You cannot undo this.
            </Paragraph>
          </div>
          <Button
            danger
            onClick={() => {
              setDeleteConfirm('');
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        </Space>
      </Card>

      <Modal
        title="Delete your account permanently?"
        open={deleteOpen}
        okText="Delete account"
        okButtonProps={{
          danger: true,
          disabled: deleteConfirm.trim().toUpperCase() !== 'DELETE',
          loading: deletingAccount,
        }}
        onOk={async () => {
          try {
            const res = await deleteMyAccount();
            const payload = (
              res.data as { deleteMyAccount?: { success?: boolean; message?: string } } | undefined
            )?.deleteMyAccount;
            if (!payload?.success) {
              message.error(payload?.message ?? 'Could not delete account');
              return;
            }
            message.success('Account deleted');
            setDeleteOpen(false);
            await logout();
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not delete account');
          }
        }}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteConfirm('');
        }}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="Settle unpaid no-show fees and finish any seated visit first."
          />
          <Paragraph style={{ marginBottom: 0 }}>
            Type <Text strong>DELETE</Text> to confirm.
          </Paragraph>
          <Input
            placeholder="DELETE"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoFocus
          />
        </Space>
      </Modal>
    </Space></div>
  );
}
