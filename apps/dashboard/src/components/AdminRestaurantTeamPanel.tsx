'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { EmptyState, formatPhoneDisplay, spacing } from '@reservations/ui';
import {
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  REMOVE_USER_RESTAURANT,
  RESTAURANT_TEAM,
} from '@/lib/graphql';
import { accountDetailPath } from '@/lib/adminAccounts';
import { isPlatformAdmin } from '@/lib/roles';

const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  diner: 'Guest',
  restaurant_owner: 'Owner',
  manager: 'Manager',
  admin: 'Admin',
  account_manager: 'Account manager',
  super_admin: 'Super admin',
};

const ROLE_COLORS: Record<string, string> = {
  diner: 'default',
  restaurant_owner: 'blue',
  manager: 'cyan',
  admin: 'orange',
  account_manager: 'purple',
  super_admin: 'red',
};

const TEAM_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'restaurant_owner', label: 'Owner' },
];

type TeamMember = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

export function AdminRestaurantTeamPanel({
  restaurantId,
  ownerId,
}: {
  restaurantId: string;
  ownerId?: string;
}) {
  const [assignUserId, setAssignUserId] = useState<string>();
  const [assignRole, setAssignRole] = useState('manager');

  const { data: teamData, refetch: refetchTeam } = useQuery(RESTAURANT_TEAM, {
    variables: { restaurantId },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    variables: { limit: 500, offset: 0 },
  });
  const [assignUserRestaurants, { loading: assigning }] = useMutation(ASSIGN_USER_RESTAURANTS);
  const [removeUserRestaurant] = useMutation(REMOVE_USER_RESTAURANT);

  const members = (teamData?.restaurantTeam ?? []) as TeamMember[];
  const owner = ownerId ? members.find((member) => member.id === ownerId) : undefined;

  const assignableUserOptions = (usersData?.adminUsers?.items ?? [])
    .filter((user: { id: string; role: string }) => {
      if (isPlatformAdmin(user.role)) return false;
      return !members.some((member) => member.id === user.id);
    })
    .map((user: { id: string; firstName: string; lastName: string; email?: string; role: string }) => ({
      value: user.id,
      label: `${user.firstName} ${user.lastName}${user.email ? ` (${user.email})` : ''} — ${ROLE_LABELS[user.role] ?? user.role}`,
    }));

  const handleAssign = async () => {
    if (!assignUserId) return;
    try {
      await assignUserRestaurants({
        variables: { userId: assignUserId, restaurantIds: [restaurantId], role: assignRole },
      });
      message.success('Account assigned');
      setAssignUserId(undefined);
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to assign account');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeUserRestaurant({ variables: { userId, restaurantId } });
      message.success('Account removed');
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  return (
    <div component="AdminRestaurantTeamPanel" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <Card title="Owner">
          {owner ? (
            <Space orientation="vertical" size={2}>
              <Link href={accountDetailPath(owner.role, owner.id)}>
                <Text strong>
                  {owner.firstName} {owner.lastName}
                </Text>
              </Link>
              {owner.email ? <Text copyable={{ text: owner.email }}>{owner.email}</Text> : null}
              {owner.phone ? (
                <Text type="secondary">{formatPhoneDisplay(owner.phone) || owner.phone}</Text>
              ) : null}
            </Space>
          ) : (
            <Text type="secondary">No owner is assigned to this restaurant.</Text>
          )}
        </Card>

        <Card
          title={`Team (${members.length})`}
          extra={
            <Space wrap>
              <Select
                style={{ minWidth: 260 }}
                placeholder="Assign an account"
                value={assignUserId}
                onChange={setAssignUserId}
                options={assignableUserOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
              <Select
                style={{ width: 180 }}
                value={assignRole}
                onChange={setAssignRole}
                options={TEAM_ROLE_OPTIONS}
              />
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                loading={assigning}
                disabled={!assignUserId}
                onClick={() => void handleAssign()}
              >
                Assign
              </Button>
            </Space>
          }
        >
          {members.length === 0 ? (
            <EmptyState
              title="No team members"
              description="Assign an owner or manager to this venue."
            />
          ) : (
            <Table<TeamMember>
              dataSource={members}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Name',
                  key: 'name',
                  render: (_: unknown, member) => (
                    <Space>
                      <Link href={accountDetailPath(member.role, member.id)}>
                        {member.firstName} {member.lastName}
                      </Link>
                      {member.id === ownerId ? <Tag color="blue">Owner</Tag> : null}
                    </Space>
                  ),
                },
                {
                  title: 'Email',
                  dataIndex: 'email',
                  render: (email: string | null) => email || '—',
                },
                {
                  title: 'Phone',
                  dataIndex: 'phone',
                  render: (phone: string | null) =>
                    phone ? formatPhoneDisplay(phone) || phone : '—',
                },
                {
                  title: 'Role',
                  dataIndex: 'role',
                  render: (role: string) => (
                    <Tag color={ROLE_COLORS[role] || 'default'}>{ROLE_LABELS[role] ?? role}</Tag>
                  ),
                },
                {
                  title: '',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, member) =>
                    member.id !== ownerId ? (
                      <Button size="small" danger onClick={() => void handleRemove(member.id)}>
                        Remove
                      </Button>
                    ) : null,
                },
              ]}
            />
          )}
        </Card>
      </Space>
    </div>
  );
}
