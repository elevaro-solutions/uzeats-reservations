'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { EmptyState, PageHeader, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageTeam } from '@/lib/roles';
import { useRequirePartner } from '@/lib/useRequirePartner';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { useFormDirty } from '@/lib/useFormDirty';
import {
  INVITE_MANAGER,
  MY_RESTAURANTS,
  REMOVE_USER_RESTAURANT,
  RESTAURANT_MANAGER_SEATS,
  RESTAURANT_TEAM,
} from '@/lib/graphql';

const { Text, Paragraph } = Typography;

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner: 'Owner',
  manager: 'Manager',
  host: 'Host',
};

const STAFF_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager — full venue ops' },
  { value: 'host', label: 'Host — reservations, floor, deposits' },
];

type TeamMember = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

export default function TeamPage() {
  const { ready } = useRequirePartner();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const canEdit = Boolean(user && canManageTeam(user.role));

  const { data: restaurantsData, loading: restaurantsLoading } = useQuery(MY_RESTAURANTS, {
    skip: !ready,
  });
  const restaurants = restaurantsData?.myRestaurants ?? [];
  const { restaurantId, restaurantSelectProps } = usePartnerRestaurant(restaurants);

  const {
    data: teamData,
    loading: teamLoading,
    refetch: refetchTeam,
  } = useQuery(RESTAURANT_TEAM, {
    variables: { restaurantId },
    skip: !ready || !restaurantId,
  });
  const {
    data: seatsData,
    loading: seatsLoading,
    refetch: refetchSeats,
  } = useQuery(RESTAURANT_MANAGER_SEATS, {
    variables: { restaurantId },
    skip: !ready || !restaurantId,
  });

  const [inviteManager, { loading: inviting }] = useMutation(INVITE_MANAGER);
  const [removeUserRestaurant, { loading: removing }] = useMutation(REMOVE_USER_RESTAURANT);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const { dirty, clearDirty, onValuesChange } = useFormDirty();

  const members = (teamData?.restaurantTeam ?? []) as TeamMember[];
  const seats = seatsData?.restaurantManagerSeats;
  const owner = useMemo(
    () => members.find((m) => m.role === 'restaurant_owner'),
    [members],
  );
  const staff = useMemo(
    () => members.filter((m) => m.role === 'manager' || m.role === 'host'),
    [members],
  );
  const atSeatLimit = Boolean(seats && seats.remaining <= 0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
  }, [authLoading, user, router]);

  if (!ready) return null;

  const refresh = async () => {
    await Promise.all([refetchTeam(), refetchSeats()]);
  };

  const onInvite = async () => {
    if (!restaurantId || !dirty) return;
    try {
      const values = await form.validateFields();
      const role = values.role === 'host' ? 'host' : 'manager';
      const res = await inviteManager({
        variables: {
          email: values.email.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          restaurantIds: [restaurantId],
          role,
        },
      });
      message.success(`Invited ${res.data?.inviteManager?.email}`);
      setInviteOpen(false);
      form.resetFields();
      clearDirty();
      await refresh();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Invite failed');
    }
  };

  const onRemove = async (userId: string) => {
    if (!restaurantId) return;
    try {
      await removeUserRestaurant({ variables: { userId, restaurantId } });
      message.success('Team member removed');
      await refresh();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  };

  return (
    <div component="TeamPage" style={{ display: 'contents' }}>
      <PageHeader
        title="Team"
        subtitle="Invite managers and hosts to help run this restaurant. Seat limits come from your package."
        extra={
          restaurants.length > 1 ? (
            <Select
              {...restaurantSelectProps}
              style={{ minWidth: 220 }}
              placeholder="Select restaurant"
            />
          ) : undefined
        }
      />

      {!restaurantId ? (
        <EmptyState
          title="No restaurant selected"
          description="Create or select a restaurant to manage your team."
        />
      ) : (
        <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
          <Card loading={seatsLoading}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>
                Team seats:{' '}
                {seats
                  ? `${seats.used + seats.pending} / ${seats.limit} used`
                  : '—'}
              </Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Your <Text code>{seats?.planKey ?? 'basic'}</Text> package includes{' '}
                {seats?.limit ?? 1} team seat{(seats?.limit ?? 1) === 1 ? '' : 's'} for managers
                and hosts. The restaurant owner does not use a team seat.
              </Paragraph>
              {atSeatLimit && canEdit ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Team seat limit reached"
                  description={
                    <span>
                      Upgrade your package to invite more staff.{' '}
                      <Link href="/billing">Go to Billing</Link>
                    </span>
                  }
                />
              ) : null}
            </Space>
          </Card>

          <Card
            title={`Staff (${staff.length})`}
            loading={teamLoading || restaurantsLoading}
            extra={
              canEdit ? (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  disabled={atSeatLimit}
                  onClick={() => {
                    clearDirty();
                    form.setFieldsValue({ role: 'manager' });
                    setInviteOpen(true);
                  }}
                >
                  Invite staff
                </Button>
              ) : null
            }
          >
            {staff.length === 0 ? (
              <EmptyState
                title="No staff yet"
                description={
                  canEdit
                    ? atSeatLimit
                      ? 'Upgrade your package to add staff.'
                      : 'Invite a manager for full ops, or a host for reservations, floor, and deposits.'
                    : 'Only the restaurant owner can invite staff.'
                }
              />
            ) : (
              <Table<TeamMember>
                dataSource={staff}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Name',
                    key: 'name',
                    render: (_: unknown, member) => (
                      <Text>
                        {member.firstName} {member.lastName}
                      </Text>
                    ),
                  },
                  {
                    title: 'Email',
                    dataIndex: 'email',
                    render: (email: string | null) => email || '—',
                  },
                  {
                    title: 'Role',
                    dataIndex: 'role',
                    render: (role: string) => (
                      <Tag color={role === 'host' ? 'geekblue' : 'cyan'}>
                        {ROLE_LABELS[role] ?? role}
                      </Tag>
                    ),
                  },
                  {
                    title: '',
                    key: 'actions',
                    width: 100,
                    render: (_: unknown, member) =>
                      canEdit ? (
                        <Button
                          size="small"
                          danger
                          loading={removing}
                          onClick={() => void onRemove(member.id)}
                        >
                          Remove
                        </Button>
                      ) : null,
                  },
                ]}
              />
            )}
          </Card>

          {owner ? (
            <Card title="Owner" size="small">
              <Space orientation="vertical" size={2}>
                <Text strong>
                  {owner.firstName} {owner.lastName}
                </Text>
                {owner.email ? <Text type="secondary">{owner.email}</Text> : null}
              </Space>
            </Card>
          ) : null}
        </Space>
      )}

      <Modal
        title="Invite staff"
        open={inviteOpen}
        onCancel={() => {
          setInviteOpen(false);
          form.resetFields();
          clearDirty();
        }}
        onOk={() => void onInvite()}
        confirmLoading={inviting}
        okText="Send invite"
        okButtonProps={{ disabled: !dirty }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          initialValues={{ role: 'manager' }}
        >
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Select a role' }]}
          >
            <Select options={STAFF_ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="firstName"
            label="First name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input autoComplete="given-name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input autoComplete="family-name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

