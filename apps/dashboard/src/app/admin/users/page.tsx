'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Card, Table, Typography, Select, Input, message, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import { ADMIN_USERS, SET_USER_ROLE } from '@/lib/graphql';

const { Title } = Typography;

const ROLES = [
  { value: 'diner', label: 'Diner' },
  { value: 'restaurant_owner', label: 'Restaurant Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery(ADMIN_USERS, { skip: user?.role !== 'admin' });
  const [setUserRole] = useMutation(SET_USER_ROLE, {
    refetchQueries: [{ query: ADMIN_USERS }],
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/');
  }, [authLoading, user, router]);

  const users = data?.adminUsers ?? [];
  const filteredUsers = search
    ? users.filter((u: any) => {
        const q = search.toLowerCase();
        return (
          u.email?.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
        );
      })
    : users;

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await setUserRole({ variables: { userId, role } });
      message.success('Role updated');
    } catch (err: any) {
      message.error(err.message || 'Failed to update role');
    }
  };

  return (
    <>
      <Title level={2}>Users</Title>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Search by name or email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 360 }}
          />
          <Table
            loading={loading}
            rowKey="id"
            dataSource={filteredUsers}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            columns={[
              {
                title: 'Name',
                render: (_: unknown, u: any) => `${u.firstName} ${u.lastName}`,
              },
              { title: 'Email', dataIndex: 'email' },
              {
                title: 'Role',
                dataIndex: 'role',
                render: (role: string, record: any) => (
                  <Select
                    value={role}
                    options={ROLES}
                    onChange={(val) => handleRoleChange(record.id, val)}
                    style={{ width: 170 }}
                    size="small"
                  />
                ),
              },
              { title: 'Points', dataIndex: 'loyaltyPoints' },
              {
                title: 'Joined',
                dataIndex: 'createdAt',
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
            ]}
          />
        </Space>
      </Card>
    </>
  );
}
