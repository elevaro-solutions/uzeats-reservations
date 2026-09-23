'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, App, Button, Form, Input, Space, Spin, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { colors, typography } from '@reservations/ui';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { AuthLayout } from '@/components/AuthLayout';
import { useAuth } from '@/lib/auth';
import { ACCEPT_MANAGER_INVITE, MANAGER_INVITE_BY_TOKEN } from '@/lib/graphql';
import { isPlatformAdmin } from '@/lib/roles';

const { Text } = Typography;

export default function AcceptInviteForm() {
  const { message } = App.useApp();
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get('token') ?? '';
  const { setSession, user } = useAuth();

  const { data, loading, error } = useQuery(MANAGER_INVITE_BY_TOKEN, {
    variables: { token },
    skip: !token,
  });
  const [acceptInvite, { loading: accepting }] = useMutation(ACCEPT_MANAGER_INVITE);

  if (user) {
    router.replace(isPlatformAdmin(user.role) ? '/admin' : '/');
    return null;
  }

  if (!token) {
    return (
      <AuthLayout heading="Invalid invite link">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="error"
            message="Missing invite token"
            description="This invitation link is incomplete. Ask your restaurant owner to send a new invite."
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block size="large" style={{ height: 46, background: colors.brand[600] }}>
              Sign in
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  if (loading) {
    return (
      <AuthLayout heading="Checking invitation">
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </AuthLayout>
    );
  }

  const invite = data?.managerInviteByToken;
  const loadError = error?.message || (!invite ? 'Invite not found' : null);

  if (loadError || !invite) {
    return (
      <AuthLayout heading="Invitation unavailable">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="error"
            message="Could not open invitation"
            description={loadError ?? 'This invitation link is invalid or has been removed.'}
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block size="large" style={{ height: 46, background: colors.brand[600] }}>
              Sign in
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  if (invite.status === 'expired') {
    return (
      <AuthLayout heading="Invitation expired">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="warning"
            message="This invitation has expired"
            description={`Ask the owner of ${invite.restaurantName} to send a new invite to ${invite.email}.`}
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block size="large" style={{ height: 46, background: colors.brand[600] }}>
              Sign in
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  if (invite.status === 'accepted' || !invite.needsPassword) {
    return (
      <AuthLayout heading="You're already on the team">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            message="Invitation already accepted"
            description={`Sign in with ${invite.email} to access ${invite.restaurantName} on Tablevera.`}
            showIcon
          />
          <Link href="/login">
            <Button type="primary" block size="large" style={{ height: 46, background: colors.brand[600] }}>
              Sign in
            </Button>
          </Link>
        </Space>
      </AuthLayout>
    );
  }

  const onFinish = async (values: { password: string }) => {
    try {
      const { data: result } = await acceptInvite({
        variables: { token, password: values.password },
      });
      const nextUser = result?.acceptManagerInvite?.user;
      if (!nextUser) {
        message.error('Failed to accept invitation');
        return;
      }
      setSession(nextUser);
      message.success('Welcome to Tablevera');
      router.replace('/');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  return (
    <div component="AcceptInviteForm" style={{ display: 'contents' }}>
      <AuthLayout
        heading="Accept invitation"
        subheading={`Join ${invite.restaurantName} as ${invite.roleLabel}. Set a password to finish.`}
      >
        <Space orientation="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
          <Text type="secondary">
            Invited as <Text strong>{invite.firstName} {invite.lastName}</Text> ({invite.email})
          </Text>
        </Space>
        <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
              { pattern: /[a-z]/, message: 'Password must include a lowercase letter' },
              { pattern: /[A-Z]/, message: 'Password must include an uppercase letter' },
              { pattern: /\d/, message: 'Password must include a number' },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: colors.textTertiary }} />}
              placeholder="Create a password"
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={accepting}
            style={{
              height: 46,
              fontWeight: typography.fontWeight.semibold,
              background: colors.brand[600],
            }}
          >
            Accept & continue
          </Button>
        </Form>
      </AuthLayout>
    </div>
  );
}
