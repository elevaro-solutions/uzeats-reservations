'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Checkbox, Divider, Form, Input, Tabs, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation } from '@apollo/client/react';
import { PhoneInput, colors, typography, usPhoneRules } from '@reservations/ui';
import { isSafeInternalPath } from '@reservations/shared';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/components/AuthLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { getDashboardUrl } from '@/lib/urls';
import { UPDATE_NOTIFICATION_PREFERENCES } from '@/lib/graphql';

export default function LoginPage() {
  return (
    <div component="LoginPage" style={{ display: 'contents' }}><Suspense>
      <LoginContent />
    </Suspense></div>
  );
}

function LoginContent() {
  const { login, loginWithGoogle, register } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  const preferRegisterTab = search.get('tab') === 'register' || search.get('smsOptIn') === '1';
  const prefillPhone = search.get('phone') ?? undefined;
  const prefillSmsOptIn = search.get('smsOptIn') === '1';

  const goNext = () => {
    const next = search.get('next');
    router.push(isSafeInternalPath(next) ? next : '/');
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      message.success('Signed in with Google');
      goNext();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div component="LoginContent" style={{ display: 'contents' }}><AuthLayout heading="Welcome back" subheading="Sign in to manage your reservations">
      <GoogleSignInButton onSuccess={handleGoogleSuccess} loading={googleLoading} />

      <Divider style={{ margin: '20px 0', color: colors.textTertiary, fontSize: typography.fontSize.sm }}>
        or continue with email
      </Divider>

      <Tabs
        centered
        size="large"
        style={{ marginBottom: 4 }}
        defaultActiveKey={preferRegisterTab ? 'register' : 'login'}
        items={[
          {
            key: 'login',
            label: 'Sign in',
            children: (
              <Form
                layout="vertical"
                requiredMark={false}
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    await login(values.email, values.password);
                    message.success('Signed in');
                    goNext();
                  } catch (err) {
                    message.error(
                      err instanceof Error ? err.message : 'Login failed',
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
                >
                  <Input
                    size="large"
                    prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
                    placeholder="you@example.com"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Enter your password' }]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
                    placeholder="••••••••"
                  />
                </Form.Item>
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <Link
                    href="/forgot-password"
                    style={{
                      color: colors.brand[600],
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  style={{
                    height: 46,
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.md,
                    background: colors.brand[600],
                  }}
                >
                  Sign in
                </Button>
              </Form>
            ),
          },
          {
            key: 'register',
            label: 'Create account',
            children: (
              <Form
                layout="vertical"
                requiredMark={false}
                initialValues={{
                  referralCode: search.get('ref') ?? undefined,
                  phone: prefillPhone,
                  smsConsent: prefillSmsOptIn,
                }}
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    await register({
                      email: values.email,
                      password: values.password,
                      firstName: values.firstName,
                      lastName: values.lastName,
                      phone: values.phone,
                      referralCode: values.referralCode?.trim() || undefined,
                    });
                    if (values.smsConsent) {
                      try {
                        await updatePrefs({
                          variables: {
                            input: {
                              reservationUpdates: { sms: true },
                              waitlistAvailable: { sms: true },
                              availabilityAlerts: { sms: true },
                            },
                          },
                        });
                      } catch {
                        // Account is created; SMS prefs can be fixed in profile.
                      }
                    }
                    message.success('Account created');
                    goNext();
                  } catch (err) {
                    message.error(
                      err instanceof Error ? err.message : 'Registration failed',
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item
                    name="firstName"
                    label="First name"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      prefix={<UserOutlined style={{ color: colors.textTertiary }} />}
                      placeholder="Jane"
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    label="Last name"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      placeholder="Doe"
                    />
                  </Form.Item>
                </div>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
                >
                  <Input
                    size="large"
                    prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
                    placeholder="you@example.com"
                  />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Phone number"
                  rules={usPhoneRules({ required: true })}
                  extra={
                    <span style={{ color: colors.textTertiary, fontSize: typography.fontSize.xs }}>
                      Used for account verification and reservation-related texts when SMS is enabled.
                      Msg &amp; data rates may apply.
                    </span>
                  }
                >
                  <PhoneInput size="large" />
                </Form.Item>
                <Form.Item
                  name="smsConsent"
                  valuePropName="checked"
                  style={{ marginBottom: 16 }}
                >
                  <Checkbox>
                    Optional: text me reservation updates and waitlist alerts from Tablevera.
                    Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out,
                    HELP for help. Not required to create an account. See{' '}
                    <Link href="/sms" target="_blank" onClick={(e) => e.stopPropagation()}>
                      SMS Terms
                    </Link>
                    .
                  </Checkbox>
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Enter a password' },
                    { min: 8, message: 'At least 8 characters' },
                    { pattern: /[a-z]/, message: 'Include a lowercase letter' },
                    { pattern: /[A-Z]/, message: 'Include an uppercase letter' },
                    { pattern: /\d/, message: 'Include a number' },
                  ]}
                  extra={
                    <span style={{ color: colors.textTertiary, fontSize: typography.fontSize.xs }}>
                      At least 8 characters with upper, lower, and a number
                    </span>
                  }
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
                    placeholder="••••••••"
                  />
                </Form.Item>
                <Form.Item name="referralCode" label="Referral code (optional)">
                  <Input size="large" placeholder="Friend's code" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  style={{
                    height: 46,
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.md,
                    background: colors.brand[600],
                    marginTop: 4,
                  }}
                >
                  Create account
                </Button>
              </Form>
            ),
          },
        ]}
      />

      <p
        style={{
          textAlign: 'center',
          margin: '20px 0 0',
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
        }}
      >
        Restaurant partner?{' '}
        <Link
          href={getDashboardUrl()}
          target="_blank"
          style={{
            color: colors.brand[600],
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Open dashboard &rarr;
        </Link>
      </p>
    </AuthLayout></div>
  );
}
