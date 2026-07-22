'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, Form, Input, Space } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { REQUEST_PASSWORD_RESET } from '@/lib/graphql';
import { AuthLayout } from '@/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: { email: string }) => {
    try {
      await requestReset({ variables: { email: values.email } });
    } catch {
      // Always show the same message to avoid email enumeration
    }
    setSubmitted(true);
  };

  return (
    <div component="ForgotPasswordPage" style={{ display: 'contents' }}><AuthLayout       heading="Reset your password"
      subheading={
        submitted
          ? undefined
          : "Enter your email and we'll send you a link to reset your password."
      }
    >
      {submitted ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="Check your email"
            description="If an account exists with that email, we've sent a password reset link."
            showIcon
          />
          <Link href="/login">
            <Button
              type="primary"
              block
              size="large"
              style={{
                height: 46,
                fontWeight: typography.fontWeight.semibold,
                background: colors.brand[600],
              }}
            >
              Back to sign in
            </Button>
          </Link>
        </Space>
      ) : (
        <>
          <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined style={{ color: colors.textTertiary }} />}
                placeholder="you@example.com"
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
                marginBottom: 16,
              }}
            >
              Send reset link
            </Button>
          </Form>
          <p
            style={{
              textAlign: 'center',
              margin: 0,
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
            }}
          >
            Remember your password?{' '}
            <Link
              href="/login"
              style={{
                color: colors.brand[600],
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout></div>
  );
}
