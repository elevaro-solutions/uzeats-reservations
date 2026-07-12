'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useAuth } from '@/lib/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace('/');
    return null;
  }

  return (
    <Card style={{ maxWidth: 420, margin: '80px auto' }}>
      <Title level={3}>Partner Hub sign in</Title>
      <Form
        layout="vertical"
        onFinish={async (values) => {
          setLoading(true);
          try {
            await login(values.email, values.password);
            message.success('Signed in');
            router.push('/');
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Sign in
        </Button>
      </Form>
      <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
        Demo: owner@reservations.local or admin@reservations.local / Password123!
      </Text>
    </Card>
  );
}
