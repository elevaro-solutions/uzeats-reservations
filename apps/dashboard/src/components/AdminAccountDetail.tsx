'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useAuth } from '@/lib/auth';
import { canEditUser, isPlatformAdmin, isSuperAdmin } from '@/lib/roles';
import { useUrlTab } from '@/lib/useUrlTab';
import { PageHeader, PhoneInput, colors, radii, spacing, usPhoneRules } from '@reservations/ui';
import { useFormDirty } from '@/lib/useFormDirty';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
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
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  ADMIN_USER,
  ADMIN_USER_RESTAURANTS,
  ADMIN_RESTAURANTS,
  ADMIN_SEND_PASSWORD_RESET,
  ADMIN_UPDATE_USER,
  ASSIGN_USER_RESTAURANTS,
  REMOVE_USER_RESTAURANT,
  START_IMPERSONATION,
} from '@/lib/graphql';
import {
  ACCOUNT_KIND_META,
  PLATFORM_ROLE_OPTIONS,
  RESTAURANT_ACCOUNT_ROLE_OPTIONS,
  ROLE_LABELS,
  accountDetailPath,
  accountKindForRole,
  accountListPath,
  type AccountKind,
} from '@/lib/adminAccounts';

const { Text, Title, Paragraph } = Typography;

const ROLE_COLORS: Record<string, string> = {
  diner: 'default',
  restaurant_owner: 'blue',
  manager: 'cyan',
  admin: 'orange',
  account_manager: 'purple',
  super_admin: 'red',
};

const DETAIL_TABS = ['overview', 'restaurants'] as const;

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

function initials(firstName?: string | null, lastName?: string | null) {
  const first = (firstName ?? '').trim().charAt(0);
  const last = (lastName ?? '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

type UserRestaurantRow = {
  id: string;
  name: string;
  cuisine?: string;
  status?: string;
  ownerId?: string;
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
  const [tab, setTab] = useUrlTab({
    defaultValue: 'overview',
    allowed: DETAIL_TABS,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const editDirty = useFormDirty();
  const assignDirty = useFormDirty();

  const { data, loading, refetch } = useQuery(ADMIN_USER, {
    skip: !ready || !id,
    variables: { id },
  });

  const user = data?.adminUser ?? null;
  const actualKind = user ? accountKindForRole(user.role) : null;

  useEffect(() => {
    if (!user) return;
    if (actualKind && actualKind !== kind) {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(`${accountDetailPath(user.role, user.id)}${qs}`);
    }
  }, [user, actualKind, kind, router]);

  const showRestaurantsTab = Boolean(
    user && (user.role === 'manager' || user.role === 'restaurant_owner'),
  );
  const canManageRestaurants = Boolean(
    user && (user.role === 'manager' || user.role === 'restaurant_owner'),
  );
  const editRole = Form.useWatch('role', form);
  const showRestaurantFieldsInEdit =
    canManageRestaurants || editRole === 'manager' || editRole === 'restaurant_owner';

  const allowedTabs = useMemo(() => {
    const tabs: string[] = ['overview'];
    if (showRestaurantsTab) tabs.push('restaurants');
    return tabs;
  }, [showRestaurantsTab]);

  useEffect(() => {
    // Wait until the account loads — otherwise ?tab=restaurants is wiped while user is still null.
    if (!user) return;
    if (tab === 'reservations' || (!showRestaurantsTab && tab === 'restaurants')) {
      setTab('overview');
    }
  }, [setTab, showRestaurantsTab, tab, user]);

  useEffect(() => {
    if (!editModalOpen || !user) return;
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
    editDirty.clearDirty();
  }, [editModalOpen, form, user, editDirty.clearDirty]);

  useEffect(() => {
    if (!assignOpen || !user) return;
    assignForm.setFieldsValue({
      restaurantIds: user.restaurantIds ?? [],
      role: user.role === 'diner' ? 'manager' : user.role,
    });
    assignDirty.clearDirty();
  }, [assignForm, assignOpen, user, assignDirty.clearDirty]);

  const {
    data: restData,
    loading: restLoading,
    refetch: refetchRestaurants,
  } = useQuery(ADMIN_USER_RESTAURANTS, {
    skip: !ready || !id || (tab !== 'restaurants' && !editModalOpen) || !showRestaurantsTab,
    variables: { userId: id },
  });

  const { data: allRestData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready || (!assignOpen && !editModalOpen),
    variables: { limit: 200, offset: 0 },
  });

  const [updateUser, { loading: updating }] = useMutation(ADMIN_UPDATE_USER);
  const [sendPasswordReset, { loading: resetting }] = useMutation(ADMIN_SEND_PASSWORD_RESET);
  const [startImpersonation, { loading: impersonating }] = useMutation(START_IMPERSONATION);
  const [assignRestaurants, { loading: assigning }] = useMutation(ASSIGN_USER_RESTAURANTS);
  const [removeRestaurant, { loading: removingRestaurant }] = useMutation(REMOVE_USER_RESTAURANT);

  const canEdit = user && currentUser ? canEditUser(currentUser.role, user.role) : false;
  const platformRoleSelectOptions = isSuperAdmin(currentUser?.role ?? '')
    ? PLATFORM_ROLE_OPTIONS
    : PLATFORM_ROLE_OPTIONS.filter(
        (option) => option.value === 'admin' || option.value === 'account_manager',
      );

  const handleEdit = () => {
    if (!user) return;
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editDirty.dirty) return;
    try {
      const values = await form.validateFields();
      const nextRole = values.role ?? user?.role;
      const shouldSaveRestaurants =
        nextRole === 'manager' ||
        nextRole === 'restaurant_owner' ||
        user?.role === 'manager' ||
        user?.role === 'restaurant_owner';
      if (nextRole === 'manager' && !(values.restaurantIds ?? []).length) {
        message.error('Managers require at least one restaurant');
        return;
      }
      await updateUser({
        variables: {
          userId: id,
          input: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone || null,
            role: values.role,
            loyaltyPoints: kind === 'diner' ? (values.loyaltyPoints ?? 0) : undefined,
            emailVerified: values.emailVerified ?? false,
            phoneVerified: values.phoneVerified ?? false,
            restaurantIds: shouldSaveRestaurants ? (values.restaurantIds ?? []) : undefined,
          },
        },
      });
      message.success('Account updated');
      editDirty.clearDirty();
      setEditModalOpen(false);
      await Promise.all([refetch(), showRestaurantsTab ? refetchRestaurants() : Promise.resolve()]);
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
    if (!assignDirty.dirty) return;
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
      assignDirty.clearDirty();
      setAssignOpen(false);
      await Promise.all([refetch(), refetchRestaurants()]);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Assign failed');
    }
  };

  const onUnassign = async (restaurantId: string) => {
    try {
      await removeRestaurant({
        variables: { userId: id, restaurantId },
      });
      message.success('Restaurant unassigned');
      await Promise.all([refetch(), refetchRestaurants()]);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to unassign restaurant');
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
  const assignedCount = user?.restaurantIds?.length ?? 0;
  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || meta.singular
    : meta.singular;

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
      render: (v?: string) => v || '—',
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
    ...(canEdit
      ? [
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: unknown, rec: UserRestaurantRow) =>
              rec.ownerId === id ? (
                <Text type="secondary">Owner</Text>
              ) : (
                <Popconfirm
                  title="Unassign this restaurant?"
                  description="They will lose Partner Hub access to this venue."
                  okText="Unassign"
                  okButtonProps={{ danger: true, loading: removingRestaurant }}
                  onConfirm={() => void onUnassign(rec.id)}
                >
                  <Button size="small" danger>
                    Unassign
                  </Button>
                </Popconfirm>
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          title={displayName}
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
            activeKey={allowedTabs.includes(tab) ? tab : 'overview'}
            onChange={setTab}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
                    <Card
                      styles={{ body: { padding: 24 } }}
                      extra={
                        <Space wrap>
                          {canEdit && (
                            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
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
                      <Space size={16} align="start" style={{ width: '100%' }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: radii.lg,
                            background: colors.brand[50],
                            border: `1px solid ${colors.brand[200]}`,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            color: colors.brand[700],
                            fontWeight: 600,
                            fontSize: 20,
                          }}
                        >
                          {initials(user.firstName, user.lastName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {displayName}
                          </Title>
                          <Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
                            {user.email || 'No email'}
                            {user.phone ? ` · ${user.phone}` : ''}
                          </Paragraph>
                          <Space wrap size={[8, 8]}>
                            <Tag color={ROLE_COLORS[user.role] ?? 'default'} icon={<UserOutlined />}>
                              {ROLE_LABELS[user.role] ?? user.role}
                            </Tag>
                            <Tag color={user.emailVerified ? 'success' : 'default'}>
                              Email {user.emailVerified ? 'verified' : 'unverified'}
                            </Tag>
                            <Tag color={user.phoneVerified ? 'success' : 'default'}>
                              Phone {user.phoneVerified ? 'verified' : 'unverified'}
                            </Tag>
                            {showRestaurantsTab ? (
                              <Tag
                                color={assignedCount > 0 ? 'blue' : 'default'}
                                icon={<ShopOutlined />}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setTab('restaurants')}
                              >
                                {assignedCount} restaurant{assignedCount === 1 ? '' : 's'}
                              </Tag>
                            ) : null}
                          </Space>
                        </div>
                      </Space>
                    </Card>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={12}>
                        <Card title="Contact" size="small">
                          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                            <div>
                              <Text type="secondary">Email</Text>
                              <div>
                                <Text copyable={user.email ? { text: user.email } : false}>
                                  {user.email || '—'}
                                </Text>
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Phone</Text>
                              <div>{user.phone || '—'}</div>
                            </div>
                            <div>
                              <Text type="secondary">Created</Text>
                              <div>{formatDate(user.createdAt)}</div>
                            </div>
                          </Space>
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card title="Access" size="small">
                          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                            <div>
                              <Text type="secondary">Role</Text>
                              <div>
                                <Tag color={ROLE_COLORS[user.role] ?? 'default'}>
                                  {ROLE_LABELS[user.role] ?? user.role}
                                </Tag>
                              </div>
                            </div>
                            {showRestaurantsTab ? (
                              <div>
                                <Text type="secondary">Assigned restaurants</Text>
                                <div>
                                  <Button
                                    type="link"
                                    style={{ padding: 0, height: 'auto' }}
                                    onClick={() => setTab('restaurants')}
                                  >
                                    {assignedCount} venue{assignedCount === 1 ? '' : 's'}
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                            {kind === 'diner' ? (
                              <>
                                <div>
                                  <Text type="secondary">Loyalty points</Text>
                                  <div>{user.loyaltyPoints ?? 0}</div>
                                </div>
                                <div>
                                  <Text type="secondary">Completed visits</Text>
                                  <div>{user.loyaltyCompletedVisits ?? 0}</div>
                                </div>
                                <div>
                                  <Text type="secondary">Loyalty tier</Text>
                                  <div>{user.loyaltyTierName ?? '—'}</div>
                                </div>
                                <div>
                                  <Text type="secondary">Referral code</Text>
                                  <div>{user.referralCode ?? '—'}</div>
                                </div>
                              </>
                            ) : null}
                          </Space>
                        </Card>
                      </Col>
                    </Row>

                    {canEdit && (
                      <Card title="Password reset" size="small">
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <Text type="secondary">
                            Send a password reset link to this {meta.singular.toLowerCase()} or
                            generate a link without emailing.
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
                      label: 'Restaurants',
                      children: (
                        <Card
                          title="Assigned restaurants"
                          extra={
                            canEdit ? (
                              <Button type="primary" onClick={() => setAssignOpen(true)}>
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
        okButtonProps={{ disabled: !editDirty.dirty }}
        destroyOnHidden
        width={640}
      >
        <Form form={form} layout="vertical" preserve onValuesChange={editDirty.onValuesChange}>
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
              <Select options={platformRoleSelectOptions} />
            </Form.Item>
          )}
          {kind === 'restaurant_owner' && (
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={RESTAURANT_ACCOUNT_ROLE_OPTIONS} />
            </Form.Item>
          )}
          {showRestaurantFieldsInEdit && (
            <Form.Item
              name="restaurantIds"
              label="Assigned restaurants"
              extra={
                editRole === 'manager' || user?.role === 'manager'
                  ? 'Managers need at least one restaurant for Partner Hub access.'
                  : undefined
              }
              rules={
                editRole === 'manager' || (!editRole && user?.role === 'manager')
                  ? [{ required: true, type: 'array', min: 1, message: 'Select at least one restaurant' }]
                  : undefined
              }
            >
              <Select
                mode="multiple"
                options={restaurantOptions}
                optionFilterProp="label"
                placeholder="Select venues"
              />
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
        okButtonProps={{ disabled: !assignDirty.dirty }}
        destroyOnHidden
      >
        <Form form={assignForm} layout="vertical" onValuesChange={assignDirty.onValuesChange}>
          {user?.role === 'diner' && (
            <Form.Item name="role" label="Promote to" rules={[{ required: true }]}>
              <Select options={RESTAURANT_ACCOUNT_ROLE_OPTIONS} />
            </Form.Item>
          )}
          <Form.Item
            name="restaurantIds"
            label="Restaurants"
            rules={[{ required: true, message: 'Select at least one restaurant' }]}
          >
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
