'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useAuth } from '@/lib/auth';
import { canEditUser, isPlatformAdmin } from '@/lib/roles';
import { PageHeader, PhoneInput, spacing, usPhoneRules } from '@reservations/ui';
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
  EyeOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  ADMIN_USER,
  ADMIN_USER_RESERVATIONS,
  ADMIN_USER_RESTAURANTS,
  ADMIN_RESTAURANTS,
  ADMIN_SEND_PASSWORD_RESET,
  ADMIN_UPDATE_USER,
  ASSIGN_USER_RESTAURANTS,
  START_IMPERSONATION,
} from '@/lib/graphql';
import {
  ACCOUNT_KIND_META,
  accountDetailPath,
  accountKindForRole,
  accountListPath,
  type AccountKind,
} from '@/lib/adminAccounts';

const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  diner: 'Diner',
  restaurant_owner: 'Restaurant Owner',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

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

const PLATFORM_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

type UserRestaurantRow = {
  id: string;
  name: string;
  cuisine?: string;
  status?: string;
  ownerId?: string;
};

type UserReservationRow = {
  id: string;
  partySize: number;
  slotStart: string;
  status: string;
  source?: string;
  depositAmountCents?: number | null;
  restaurant?: { id: string; name: string };
};

type Props = {
  kind: AccountKind;
};

function AdminAccountDetailContent({ kind }: Props) {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');
  const meta = ACCOUNT_KIND_META[kind];
  const { ready } = useRequireAdmin();
  const { user: currentUser, beginImpersonation } = useAuth();
  const [tab, setTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [resPage, setResPage] = useState(1);
  const [resPageSize, setResPageSize] = useState(10);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_USER, {
    skip: !ready || !id,
    variables: { id },
  });

  const user = data?.adminUser ?? null;
  const actualKind = user ? accountKindForRole(user.role) : null;

  useEffect(() => {
    if (!user) return;
    if (actualKind && actualKind !== kind) {
      router.replace(accountDetailPath(user.role, user.id));
    }
  }, [user, actualKind, kind, router]);

  const showRestaurantsTab = Boolean(
    user && (actualKind === 'staff' || actualKind === 'restaurant_owner'),
  );
  const showReservationsTab = true;

  const { data: resData, loading: resLoading } = useQuery(ADMIN_USER_RESERVATIONS, {
    skip: !ready || !id || tab !== 'reservations',
    variables: { userId: id, limit: resPageSize, offset: (resPage - 1) * resPageSize },
  });

  const { data: restData, loading: restLoading } = useQuery(ADMIN_USER_RESTAURANTS, {
    skip: !ready || !id || tab !== 'restaurants' || !showRestaurantsTab,
    variables: { userId: id },
  });

  const { data: allRestData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready || !assignOpen,
    variables: { limit: 200, offset: 0 },
  });

  const [updateUser, { loading: updating }] = useMutation(ADMIN_UPDATE_USER);
  const [sendPasswordReset, { loading: resetting }] = useMutation(ADMIN_SEND_PASSWORD_RESET);
  const [startImpersonation, { loading: impersonating }] = useMutation(START_IMPERSONATION);
  const [assignRestaurants, { loading: assigning }] = useMutation(ASSIGN_USER_RESTAURANTS);

  const canEdit = user && currentUser ? canEditUser(currentUser.role, user.role) : false;

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
      restaurantIds: user.restaurantIds ?? [],
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
            restaurantIds: values.restaurantIds,
          },
        },
      });
      message.success('Account updated');
      setEditModalOpen(false);
      void refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update account');
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

  const onImpersonate = async () => {
    if (!user) return;
    try {
      const res = await startImpersonation({ variables: { userId: user.id } });
      const payload = res.data?.startImpersonation;
      beginImpersonation(payload.user, payload.impersonator);
      message.success(`Viewing as ${payload.user.firstName}`);
      window.location.href = '/';
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Impersonation failed');
    }
  };

  const onAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await assignRestaurants({
        variables: {
          userId: id,
          restaurantIds: values.restaurantIds,
          role: user?.role === 'diner' ? values.role : user?.role,
        },
      });
      message.success('Restaurants assigned');
      setAssignOpen(false);
      void refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Assign failed');
    }
  };

  if (!ready) return null;

  if (!loading && !user) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title={meta.singular}
          extra={
            <Link href={accountListPath(kind)}>
              <Button icon={<ArrowLeftOutlined />}>Back to {meta.title.toLowerCase()}</Button>
            </Link>
          }
        />
        <Empty description={`${meta.singular} not found`} />
      </Space>
    );
  }

  if (user && actualKind && actualKind !== kind) {
    return (
      <Card>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  const restaurantOptions = (allRestData?.adminRestaurants?.items ?? []).map(
    (r: { id: string; name: string }) => ({
      value: r.id,
      label: r.name,
    }),
  );

  const reservationColumns = [
    {
      title: 'Restaurant',
      dataIndex: ['restaurant', 'name'],
      key: 'restaurant',
      render: (_: unknown, rec: UserReservationRow) =>
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
      render: (_: unknown, rec: UserRestaurantRow) => (
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
    {
      title: 'Relationship',
      key: 'relationship',
      render: (_: unknown, rec: UserRestaurantRow) =>
        rec.ownerId === id ? <Tag color="blue">Owner</Tag> : <Tag>Assigned</Tag>,
    },
  ];

  return (
    <>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          title={user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || meta.singular : meta.singular}
          extra={
            <Space wrap>
              <Link href={accountListPath(kind)}>
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
              {user?.role && (
                <Tag color={ROLE_COLORS[user.role] ?? 'default'}>
                  {ROLE_LABELS[user.role] ?? user.role.replace(/_/g, ' ')}
                </Tag>
              )}
              <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
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
                  <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
                    <Card
                      title="Account details"
                      extra={
                        <Space wrap>
                          {canEdit && (
                            <Button icon={<EditOutlined />} onClick={handleEdit}>
                              Edit
                            </Button>
                          )}
                          {!isPlatformAdmin(user.role) && (
                            <Button
                              icon={<EyeOutlined />}
                              loading={impersonating}
                              onClick={() => void onImpersonate()}
                            >
                              View as
                            </Button>
                          )}
                        </Space>
                      }
                    >
                      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="First name">{user.firstName ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Last name">{user.lastName ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{user.email ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{user.phone ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Role">
                          <Tag color={ROLE_COLORS[user.role] ?? 'default'}>
                            {ROLE_LABELS[user.role] ?? user.role.replace(/_/g, ' ')}
                          </Tag>
                        </Descriptions.Item>
                        {kind === 'diner' && (
                          <>
                            <Descriptions.Item label="Loyalty points">
                              {user.loyaltyPoints ?? 0}
                            </Descriptions.Item>
                            <Descriptions.Item label="Completed visits">
                              {user.loyaltyCompletedVisits ?? 0}
                            </Descriptions.Item>
                            <Descriptions.Item label="Loyalty tier">
                              {user.loyaltyTierName ?? '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Referral code">
                              {user.referralCode ?? '—'}
                            </Descriptions.Item>
                          </>
                        )}
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

                    {canEdit && (
                      <Card title="Password reset">
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <Text>
                            Send a password reset link to this {meta.singular.toLowerCase()} or generate a
                            link without emailing.
                          </Text>
                          <Button
                            icon={<MailOutlined />}
                            disabled={!user.email}
                            onClick={() => {
                              setResetUrl(null);
                              setResetModalOpen(true);
                            }}
                          >
                            Reset password
                          </Button>
                        </Space>
                      </Card>
                    )}
                  </Space>
                ),
              },
              ...(showRestaurantsTab
                ? [
                    {
                      key: 'restaurants',
                      label: kind === 'diner' ? 'Venue access' : 'Restaurants',
                      children: (
                        <Card
                          extra={
                            canEdit ? (
                              <Button
                                onClick={() => {
                                  assignForm.setFieldsValue({
                                    restaurantIds: user.restaurantIds ?? [],
                                    role: user.role === 'diner' ? 'staff' : user.role,
                                  });
                                  setAssignOpen(true);
                                }}
                              >
                                Assign venues
                              </Button>
                            ) : null
                          }
                        >
                          <Table<UserRestaurantRow>
                            dataSource={restData?.adminUserRestaurants ?? []}
                            columns={restaurantColumns}
                            rowKey="id"
                            pagination={false}
                            loading={restLoading}
                            locale={{ emptyText: <Empty description="No restaurants assigned" /> }}
                          />
                        </Card>
                      ),
                    },
                  ]
                : []),
              ...(showReservationsTab
                ? [
                    {
                      key: 'reservations',
                      label: 'Reservations',
                      children: (
                        <Card>
                          <Table<UserReservationRow>
                            dataSource={resData?.adminUserReservations?.items ?? []}
                            columns={reservationColumns}
                            rowKey="id"
                            loading={resLoading}
                            locale={{
                              emptyText: <Empty description="No reservations" />,
                            }}
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
                  ]
                : []),
            ]}
          />
        ) : null}
      </Space>

      <Modal
        title={`Edit ${meta.singular.toLowerCase()}`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        confirmLoading={updating}
        destroyOnHidden
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
          <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })}>
            <PhoneInput />
          </Form.Item>
          {kind === 'platform' && (
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={PLATFORM_ROLE_OPTIONS} />
            </Form.Item>
          )}
          {kind === 'diner' && (
            <Form.Item name="loyaltyPoints" label="Loyalty points">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
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

      <Modal
        title="Reset password"
        open={resetModalOpen}
        onCancel={() => {
          setResetModalOpen(false);
          setResetUrl(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
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

      <Modal
        title="Assign venues"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={onAssign}
        confirmLoading={assigning}
        destroyOnHidden
      >
        <Form form={assignForm} layout="vertical">
          {user?.role === 'diner' && (
            <Form.Item name="role" label="Promote to" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'staff', label: 'Staff' },
                  { value: 'restaurant_owner', label: 'Restaurant owner' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item name="restaurantIds" label="Restaurants" rules={[{ required: true }]}>
            <Select mode="multiple" options={restaurantOptions} optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function AdminAccountDetail({ kind }: Props) {
  return (
    <Suspense fallback={null}>
      <AdminAccountDetailContent kind={kind} />
    </Suspense>
  );
}
