'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useAuth } from '@/lib/auth';
import { canEditUser, isPlatformAdmin } from '@/lib/roles';
import { PageHeader, spacing } from '@reservations/ui';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  MailOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  ADMIN_USER,
  ADMIN_USER_RESERVATIONS,
  ADMIN_RESTAURANTS,
  ADMIN_SEND_PASSWORD_RESET,
  ADMIN_UPDATE_USER,
} from '@/lib/graphql';

const { Text, Title } = Typography;

const ROLES = [
  { value: 'diner', label: 'Diner' },
  { value: 'restaurant_owner', label: 'Restaurant Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const ROLE_COLORS: Record<string, string> = {
  diner: 'default',
  restaurant_owner: 'blue',
  staff: 'cyan',
  admin: 'orange',
  super_admin: 'red',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'green',
  pending: 'orange',
  cancelled: 'red',
  seated: 'blue',
  completed: 'green',
  no_show: 'volcano',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function AdminUserDetailContent() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [resPage, setResPage] = useState(1);
  const [resPageSize, setResPageSize] = useState(10);
  const [form] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_USER, {
    skip: !ready || !id,
    variables: { id },
  });

  const user = data?.adminUser ?? null;

  const { data: resData, loading: resLoading } = useQuery(ADMIN_USER_RESERVATIONS, {
    skip: !ready || !id || tab !== 'reservations',
    variables: { userId: id, limit: resPageSize, offset: (resPage - 1) * resPageSize },
  });

  const { data: restData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready || !user?.restaurantIds?.length || tab !== 'restaurants',
    variables: { limit: 200 },
  });

  const userRestaurants = useMemo(() => {
    if (!user?.restaurantIds?.length || !restData?.adminRestaurants?.items) return [];
    const ids = new Set(user.restaurantIds);
    return restData.adminRestaurants.items.filter((r: any) => ids.has(r.id));
  }, [user?.restaurantIds, restData]);

  const [updateUser, { loading: updating }] = useMutation(ADMIN_UPDATE_USER);
  const [sendPasswordReset, { loading: resetting }] = useMutation(ADMIN_SEND_PASSWORD_RESET);

  const handleEdit = () => {
    if (!user) return;
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints ?? 0,
      emailVerified: user.emailVerified ?? false,
      phoneVerified: user.phoneVerified ?? false,
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateUser({
        variables: {
          userId: id,
          input: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone || null,
            role: values.role,
            loyaltyPoints: values.loyaltyPoints ?? 0,
            emailVerified: values.emailVerified ?? false,
            phoneVerified: values.phoneVerified ?? false,
          },
        },
      });
      message.success('User updated');
      setEditModalOpen(false);
      void refetch();
    } catch {
      /* validation error */
    }
  };

  const handlePasswordReset = async (sendEmail: boolean) => {
    try {
      const { data: resetData } = await sendPasswordReset({
        variables: { userId: id, sendEmail },
      });
      const result = resetData?.adminSendPasswordReset;
      if (result?.resetUrl) {
        setResetUrl(result.resetUrl);
      }
      message.success(result?.message ?? 'Password reset initiated');
    } catch {
      message.error('Failed to send password reset');
    }
  };

  const refresh = () => void refetch();

  if (!ready) return null;

  if (!loading && !user) {
    return (
      <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="User"
          extra={
            <Link href="/admin/users">
              <Button icon={<ArrowLeftOutlined />}>Back to users</Button>
            </Link>
          }
        />
        <Empty description="User not found" />
      </Space>
    );
  }

  const reservationColumns = [
    {
      title: 'Restaurant',
      dataIndex: ['restaurant', 'name'],
      key: 'restaurant',
      render: (_: any, rec: any) =>
        rec.restaurant ? (
          <Link href={`/admin/restaurants/${rec.restaurant.id}`}>{rec.restaurant.name}</Link>
        ) : (
          '—'
        ),
    },
    {
      title: 'Date',
      dataIndex: 'slotStart',
      key: 'date',
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Party size',
      dataIndex: 'partySize',
      key: 'partySize',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] ?? 'default'}>{s?.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: 'Deposit',
      dataIndex: 'depositAmountCents',
      key: 'deposit',
      render: (v: number | null) => money(v),
    },
  ];

  const restaurantColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, rec: any) => (
        <Link href={`/admin/restaurants/${rec.id}`}>{rec.name}</Link>
      ),
    },
    {
      title: 'Cuisine',
      dataIndex: 'cuisine',
      key: 'cuisine',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag>{s}</Tag>,
    },
  ];

  return (
    <div component="AdminUserDetailPage" style={{ display: 'contents' }}>
      <Space direction="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          title={user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User' : 'User'}
          extra={
            <Space wrap>
              <Link href="/admin/users">
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
              {user?.role && <Tag color={ROLE_COLORS[user.role] ?? 'default'}>{user.role?.replace(/_/g, ' ')}</Tag>}
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                Refresh
              </Button>
            </Space>
          }
        />

        {loading && !user ? (
          <Card>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
              <Spin size="large" />
            </div>
          </Card>
        ) : user ? (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Space direction="vertical" size={spacing.md} style={{ width: '100%' }}>
                    <Card
                      title="User details"
                      extra={
                        <Button icon={<EditOutlined />} onClick={handleEdit}>
                          Edit
                        </Button>
                      }
                    >
                      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="First name">{user.firstName ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Last name">{user.lastName ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{user.email ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{user.phone ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Role">
                          <Tag color={ROLE_COLORS[user.role] ?? 'default'}>{user.role?.replace(/_/g, ' ')}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Loyalty points">{user.loyaltyPoints ?? 0}</Descriptions.Item>
                        <Descriptions.Item label="Email verified">
                          <Tag color={user.emailVerified ? 'green' : 'default'}>
                            {user.emailVerified ? 'Yes' : 'No'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone verified">
                          <Tag color={user.phoneVerified ? 'green' : 'default'}>
                            {user.phoneVerified ? 'Yes' : 'No'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Created">{formatDate(user.createdAt)}</Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Card title="Password reset">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text>Send a password reset link to the user or generate a link without emailing.</Text>
                        <Space wrap>
                          <Button
                            icon={<MailOutlined />}
                            loading={resetting}
                            onClick={() => setResetModalOpen(true)}
                          >
                            Reset Password
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'restaurants',
                label: 'Restaurants',
                children: user.restaurantIds?.length ? (
                  <Card>
                    <Table
                      dataSource={userRestaurants}
                      columns={restaurantColumns}
                      rowKey="id"
                      pagination={false}
                      loading={!restData && !!user.restaurantIds?.length}
                    />
                  </Card>
                ) : (
                  <Card>
                    <Empty description="No restaurants assigned" />
                  </Card>
                ),
              },
              {
                key: 'reservations',
                label: 'Reservations',
                children: (
                  <Card>
                    <Table
                      dataSource={resData?.adminUserReservations?.items ?? []}
                      columns={reservationColumns}
                      rowKey="id"
                      loading={resLoading}
                      pagination={{
                        current: resPage,
                        pageSize: resPageSize,
                        total: resData?.adminUserReservations?.total ?? 0,
                        showSizeChanger: true,
                        onChange: (page, pageSize) => {
                          setResPage(page);
                          setResPageSize(pageSize);
                        },
                      }}
                    />
                  </Card>
                ),
              },
            ]}
          />
        ) : null}
      </Space>

      {/* Edit user modal */}
      <Modal
        title="Edit user"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        confirmLoading={updating}
        destroyOnClose
        afterOpenChange={(open) => {
          if (open && user) {
            form.setFieldsValue({
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              role: user.role,
              loyaltyPoints: user.loyaltyPoints ?? 0,
              emailVerified: user.emailVerified ?? false,
              phoneVerified: user.phoneVerified ?? false,
            });
          }
        }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLES} />
          </Form.Item>
          <Form.Item name="loyaltyPoints" label="Loyalty points">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="emailVerified" label="Email verified" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneVerified" label="Phone verified" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Password reset modal */}
      <Modal
        title="Reset password"
        open={resetModalOpen}
        onCancel={() => {
          setResetModalOpen(false);
          setResetUrl(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text>Choose how to send the password reset:</Text>
          <Space wrap>
            <Button
              icon={<MailOutlined />}
              type="primary"
              loading={resetting}
              onClick={() => void handlePasswordReset(true)}
            >
              Email reset link
            </Button>
            <Button loading={resetting} onClick={() => void handlePasswordReset(false)}>
              Generate link only
            </Button>
          </Space>
          {resetUrl && (
            <>
              <Input.TextArea value={resetUrl} readOnly rows={3} />
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(resetUrl);
                  message.success('Copied to clipboard');
                }}
              >
                Copy
              </Button>
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={null}>
      <AdminUserDetailContent />
    </Suspense>
  );
}
