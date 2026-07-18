'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, Form, Input, Space, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { RESET_PASSWORD } from '@/lib/graphql';
import { AuthLayout } from '@/components/AuthLayout';

export default function ResetPasswordForm() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <AuthLayout heading="Invalid reset link">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="error"
            message="Link expired or invalid"
            description="This password reset link is invalid or has expired. Please request a new one."
            showIcon
          />
          <Link href="/forgot-password">
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
              Request new link
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout heading="Password updated">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="You're all set"
            description="Your password has been reset successfully. You can now sign in with your new password."
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
              Sign in
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  const onFinish = async (values: { password: string }) => {
    try {
      const { data } = await resetPassword({
        variables: { token, newPassword: values.password },
      });
      if ((data as any)?.resetPassword?.success) {
        setSuccess(true);
      } else {
        message.error(
          (data as any)?.resetPassword?.message ?? 'Failed to reset password',
        );
      }
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to reset password',
      );
    }
  };

  return (
    <AuthLayout
      heading="Set new password"
      subheading="Enter your new password below."
    >
      <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="password"
          label="New password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
            placeholder="New password"
          />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
            placeholder="Confirm password"
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
          Reset password
        </Button>
      </Form>
    </AuthLayout>
  );
}
