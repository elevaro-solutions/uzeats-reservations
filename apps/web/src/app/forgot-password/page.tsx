'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { REQUEST_PASSWORD_RESET } from '@/lib/graphql';

const { Title, Text } = Typography;

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
    <Card style={{ maxWidth: 420, margin: '40px auto' }}>
      <Title level={3} style={{ marginTop: 0 }}>
        Reset your password
      </Title>

      {submitted ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="Check your email"
            description="If an account exists with that email, we've sent a password reset link."
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block>
              Back to sign in
            </Button>
          </Link>
        </Space>
      ) : (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Enter your email address and we&apos;ll send you a link to reset your
            password.
          </Text>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ marginBottom: 12 }}
            >
              Send reset link
            </Button>
          </Form>
          <Text>
            Remember your password?{' '}
            <Link href="/login">Sign in</Link>
          </Text>
        </>
      )}
    </Card>
  );
}
