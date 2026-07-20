'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Divider, Form, Input, Tabs, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PhoneInput, colors, typography, usPhoneRules } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/components/AuthLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login, loginWithGoogle, register } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const goNext = () => router.push(search.get('next') ?? '/');

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
    <AuthLayout heading="Welcome back" subheading="Sign in to manage your reservations">
      <GoogleSignInButton onSuccess={handleGoogleSuccess} loading={googleLoading} />

      <Divider style={{ margin: '20px 0', color: colors.textTertiary, fontSize: typography.fontSize.sm }}>
        or continue with email
      </Divider>

      <Tabs
        centered
        size="large"
        style={{ marginBottom: 4 }}
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
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    await register({ ...values, phone: values.phone });
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
                >
                  <PhoneInput size="large" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Enter a password' },
                    { min: 8, message: 'At least 8 characters' },
                  ]}
                  extra={
                    <span style={{ color: colors.textTertiary, fontSize: typography.fontSize.xs }}>
                      Must be at least 8 characters
                    </span>
                  }
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
                    placeholder="••••••••"
                  />
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
          href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001'}
          target="_blank"
          style={{
            color: colors.brand[600],
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Open dashboard &rarr;
        </Link>
      </p>
    </AuthLayout>
  );
}
