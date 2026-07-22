'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { App, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/components/AuthLayout';

export default function LoginPage() {
  const { message } = App.useApp();
  const { login, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace(user.role === 'admin' ? '/admin' : '/');
    return null;
  }

  return (
    <div component="LoginPage" style={{ display: 'contents' }}><AuthLayout       heading="Partner Hub sign in"
      subheading="Sign in to manage your restaurant"
    >
      <Form
        layout="vertical"
        requiredMark={false}
        onFinish={async (values) => {
          setLoading(true);
          try {
            await login(values.email, values.password);
            message.success('Signed in');
            // Role-aware landing is handled by / redirect for admins
            router.push('/');
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Enter your email' },
            { type: 'email', message: 'Enter a valid email' },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
            placeholder="you@restaurant.com"
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

      <p
        style={{
          marginTop: 20,
          marginBottom: 0,
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
        }}
      >
        New restaurant partner?{' '}
        <Link
          href="/register"
          style={{ color: colors.brand[600], fontWeight: typography.fontWeight.semibold }}
        >
          Create an account
        </Link>
      </p>

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          background: colors.neutral[50],
          borderRadius: 8,
          border: `1px solid ${colors.bordersubtle}`,
        }}
      >
        <p
          style={{
            margin: 0,
            color: colors.textSecondary,
            fontSize: typography.fontSize.xs,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: colors.textPrimary }}>Demo credentials</strong>
          <br />
          owner@tablevera.local or admin@tablevera.local
          <br />
          Password: Password123!
          <br />
          <span style={{ color: colors.textTertiary }}>
            Diners: use the booking app, not Partner Hub.
          </span>
        </p>
      </div>
    </AuthLayout></div>
  );
}
