'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { RESET_PASSWORD } from '@/lib/graphql';

const { Title, Text } = Typography;

export default function ResetPasswordForm() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get('token') ?? '';
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Card style={{ maxWidth: 420, margin: '40px auto' }}>
        <Alert
          type="error"
          message="Invalid reset link"
          description="This password reset link is invalid or has expired. Please request a new one."
          showIcon
        />
        <Link href="/forgot-password">
          <Button type="primary" style={{ marginTop: 16 }}>
            Request new link
          </Button>
        </Link>
      </Card>
    );
  }

  if (success) {
    return (
      <Card style={{ maxWidth: 420, margin: '40px auto' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="Password updated"
            description="Your password has been reset successfully. You can now sign in with your new password."
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block>
              Sign in
            </Button>
          </Link>
        </Space>
      </Card>
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
        message.error((data as any)?.resetPassword?.message ?? 'Failed to reset password');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  return (
    <Card style={{ maxWidth: 420, margin: '40px auto' }}>
      <Title level={3} style={{ marginTop: 0 }}>
        Set new password
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Enter your new password below.
      </Text>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="password"
          label="New password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="New password" />
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
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Reset password
        </Button>
      </Form>
    </Card>
  );
}
