'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Form, Input, Tabs, Typography, message } from 'antd';
import { useAuth } from '@/lib/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login, register } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);

  const goNext = () => router.push(search.get('next') ?? '/');

  return (
    <Card style={{ maxWidth: 420, margin: '40px auto' }}>
      <Title level={3}>Welcome back</Title>
      <Tabs
        items={[
          {
            key: 'login',
            label: 'Sign in',
            children: (
              <Form
                layout="vertical"
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    await login(values.email, values.password);
                    message.success('Signed in');
                    goNext();
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
                <div style={{ marginBottom: 12, textAlign: 'right' }}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Sign in
                </Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                  Demo: diner@reservations.local / Password123!
                </Text>
              </Form>
            ),
          },
          {
            key: 'register',
            label: 'Create account',
            children: (
              <Form
                layout="vertical"
                onFinish={async (values) => {
                  setLoading(true);
                  try {
                    await register(values);
                    message.success('Account created');
                    goNext();
                  } catch (err) {
                    message.error(err instanceof Error ? err.message : 'Registration failed');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, min: 8 }]}
                >
                  <Input.Password />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Sign up
                </Button>
              </Form>
            ),
          },
        ]}
      />
      <Text>
        Restaurant partner?{' '}
        <Link href="http://localhost:3001" target="_blank">
          Open dashboard
        </Link>
      </Text>
    </Card>
  );
}
