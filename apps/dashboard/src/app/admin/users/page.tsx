'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  MoreOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { PageHeader, PhoneInput, spacing, usPhoneRules } from '@reservations/ui';
import {
  ADMIN_DELETE_USER,
  ADMIN_RESTAURANTS,
  ADMIN_SEND_PASSWORD_RESET,
  ADMIN_UPDATE_USER,
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  INVITE_STAFF,
  PLATFORM_CONFIG,
  REQUEST_ADMIN_DELETE_USER_CODE,
  SET_USER_ROLE,
  START_IMPERSONATION,
} from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Paragraph, Text } = Typography;

const ROLES = [
  { value: 'diner', label: 'Diner' },
  { value: 'restaurant_owner', label: 'Restaurant Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

function AdminUsersPageContent() {
  const { ready } = useRequireAdmin();
  const { user, beginImpersonation } = useAuth();
  const [search, setSearch] = useState('');
  const [resetModal, setResetModal] = useState<{
    userId: string;
    name: string;
    email?: string;
    resetUrl?: string;
    message?: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    userId: string;
    name: string;
    email?: string;
    role: string;
    requires2FA?: boolean;
    emailedTo?: string | null;
    statusMessage?: string;
  } | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [inviteForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { data, loading, refetch } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { search: search || undefined, limit, offset },
  });
  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: { limit: 200, offset: 0 },
  });
  const { data: configData } = useQuery(PLATFORM_CONFIG, { skip: !ready });
  const [setUserRole] = useMutation(SET_USER_ROLE, { onCompleted: () => refetch() });
  const [sendReset, { loading: resetting }] = useMutation(ADMIN_SEND_PASSWORD_RESET);
  const [startImpersonation, { loading: impersonating }] = useMutation(START_IMPERSONATION);
  const [inviteStaff, { loading: inviting }] = useMutation(INVITE_STAFF);
  const [requestDeleteCode, { loading: requestingCode }] = useMutation(
    REQUEST_ADMIN_DELETE_USER_CODE,
  );
  const [deleteUser, { loading: deletingUser }] = useMutation(ADMIN_DELETE_USER);
  const [updateUser, { loading: savingUser }] = useMutation(ADMIN_UPDATE_USER, {
    onCompleted: () => {
      message.success('Account updated');
      setEditingUser(null);
      refetch();
    },
  });
  const [assignRestaurants, { loading: assigning }] = useMutation(ASSIGN_USER_RESTAURANTS, {
    onCompleted: () => {
      refetch();
      setAssignUser(null);
      assignForm.resetFields();
    },
  });

  if (!ready) return null;

  const requireDelete2FA = configData?.platformConfig?.requireAdminDelete2FA !== false;

  const restaurantOptions = (restaurantsData?.adminRestaurants?.items ?? []).map((r: any) => ({
    value: r.id,
    label: r.name,
  }));

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await setUserRole({ variables: { userId, role } });
      message.success('Role updated');
    } catch (err: any) {
      message.error(err.message || 'Failed to update role');
    }
  };

  const runReset = async (sendEmail: boolean) => {
    if (!resetModal) return;
    try {
      const res = await sendReset({
        variables: { userId: resetModal.userId, sendEmail },
      });
      const payload = res.data?.adminSendPasswordReset;
      setResetModal({
        ...resetModal,
        resetUrl: payload?.resetUrl,
        message: payload?.message,
      });
      message.success(payload?.message || 'Reset link ready');
    } catch (err: any) {
      message.error(err.message || 'Failed to create reset link');
    }
  };

  const onImpersonate = async (record: any) => {
    try {
      const res = await startImpersonation({ variables: { userId: record.id } });
      const payload = res.data?.startImpersonation;
      beginImpersonation(payload.accessToken, payload.user, payload.impersonator);
      message.success(`Viewing as ${payload.user.firstName}`);
      window.location.href = '/';
    } catch (err: any) {
      message.error(err.message || 'Impersonation failed');
    }
  };

  const openEdit = (record: any) => {
    setEditingUser(record);
    editForm.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email ?? '',
      phone: record.phone ?? '',
      role: record.role,
      loyaltyPoints: record.loyaltyPoints ?? 0,
      emailVerified: Boolean(record.emailVerified),
      phoneVerified: Boolean(record.phoneVerified),
      restaurantIds: record.restaurantIds ?? [],
    });
  };

  const onSaveUser = async () => {
    try {
      const values = await editForm.validateFields();
      await updateUser({
        variables: {
          userId: editingUser.id,
          input: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email || undefined,
            phone: values.phone || undefined,
            role: values.role,
            loyaltyPoints: values.loyaltyPoints,
            emailVerified: values.emailVerified,
            phoneVerified: values.phoneVerified,
            restaurantIds: values.restaurantIds ?? [],
          },
        },
      });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to update account');
    }
  };

  const onInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      const res = await inviteStaff({ variables: values });
      message.success(`Invited ${res.data?.inviteStaff?.email}`);
      Modal.info({
        title: 'Invite sent',
        content: (
          <div>
            <Paragraph>Share this link if the email does not arrive:</Paragraph>
            <Input.TextArea value={res.data?.inviteStaff?.inviteUrl} autoSize readOnly />
          </div>
        ),
      });
      setInviteOpen(false);
      inviteForm.resetFields();
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Invite failed');
    }
  };

  const onAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await assignRestaurants({
        variables: {
          userId: assignUser.id,
          restaurantIds: values.restaurantIds,
          role: values.role,
        },
      });
      message.success('Restaurants assigned');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Assign failed');
    }
  };

  const openDelete = (record: any) => {
    setDeleteCode('');
    setDeleteModal({
      userId: record.id,
      name: `${record.firstName} ${record.lastName}`,
      email: record.email,
      role: record.role,
      requires2FA: requireDelete2FA,
    });
  };

  const sendDeleteCode = async () => {
    if (!deleteModal) return;
    try {
      const res = await requestDeleteCode({ variables: { userId: deleteModal.userId } });
      const payload = res.data?.requestAdminDeleteUserCode;
      setDeleteModal({
        ...deleteModal,
        requires2FA: payload?.requires2FA,
        emailedTo: payload?.emailedTo,
        statusMessage: payload?.message,
      });
      message.success(payload?.message || 'Code sent');
    } catch (err: any) {
      message.error(err.message || 'Failed to send confirmation code');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.requires2FA !== false && !deleteCode.trim()) {
        message.error('Enter the confirmation code from support.uzeats@gmail.com');
        return;
      }
      const res = await deleteUser({
        variables: {
          userId: deleteModal.userId,
          code: deleteModal.requires2FA === false ? undefined : deleteCode.trim(),
        },
      });
      message.success(res.data?.adminDeleteUser?.message || 'User deleted');
      setDeleteModal(null);
      setDeleteCode('');
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete user');
    }
  };

  const actionItems = (record: any): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => openEdit(record),
    },
    {
      key: 'view-as',
      icon: <EyeOutlined />,
      label: 'View as',
      disabled: record.role === 'admin' || impersonating,
      onClick: () => onImpersonate(record),
    },
    {
      key: 'assign',
      label: 'Assign venues',
      onClick: () => setAssignUser(record),
    },
    {
      key: 'reset',
      icon: <MailOutlined />,
      label: 'Reset password',
      disabled: !record.email,
      onClick: () =>
        setResetModal({
          userId: record.id,
          name: `${record.firstName} ${record.lastName}`,
          email: record.email,
        }),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      disabled: record.id === user?.id,
      onClick: () => openDelete(record),
    },
  ];

  return (
    <div component="AdminUsersPageContent" style={{ display: 'contents' }}><>
      <Space direction="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Users & access"
          subtitle="Roles, staff invites, restaurant assignment, impersonation, password resets, and account deletion."
          extra={
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)}>
              Invite staff
            </Button>
          }
        />
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Input
              placeholder="Search by name or email..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(1);
              }}
              allowClear
              style={{ maxWidth: 360 }}
            />
            <Table
              loading={loading}
              rowKey="id"
              scroll={{ x: 700 }}
              dataSource={data?.adminUsers?.items ?? []}
              pagination={tablePagination(data?.adminUsers?.total ?? 0, {
                showSizeChanger: true,
              })}
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
                {
                  title: 'Restaurants',
                  dataIndex: 'restaurantIds',
                  width: 100,
                  render: (ids: string[]) => ids?.length ?? 0,
                },
                {
                  title: 'Actions',
                  width: 90,
                  fixed: 'right',
                  render: (_: unknown, record: any) => (
                    <Dropdown
                      menu={{ items: actionItems(record) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button size="small" icon={<MoreOutlined />}>
                        More
                      </Button>
                    </Dropdown>
                  ),
                },
              ]}
            />
          </Space>
        </Card>
      </Space>

      <Modal
        title={`Delete user — ${deleteModal?.name ?? ''}`}
        open={Boolean(deleteModal)}
        onCancel={() => {
          setDeleteModal(null);
          setDeleteCode('');
        }}
        destroyOnClose
        footer={
          <Space>
            <Button
              onClick={() => {
                setDeleteModal(null);
                setDeleteCode('');
              }}
            >
              Cancel
            </Button>
            {deleteModal?.requires2FA !== false && (
              <Button loading={requestingCode} onClick={sendDeleteCode}>
                Send code
              </Button>
            )}
            <Button
              type="primary"
              danger
              loading={deletingUser}
              onClick={confirmDeleteUser}
              disabled={deleteModal?.requires2FA !== false && !deleteCode.trim()}
            >
              Delete permanently
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary">
          Permanently deletes this account and related test records (reservations, reviews,
          messages, owned restaurants and venue data, etc.). This cannot be undone.
        </Paragraph>
        <Paragraph>
          <Text strong>{deleteModal?.name}</Text>
          {deleteModal?.email ? ` · ${deleteModal.email}` : ''} · {deleteModal?.role}
        </Paragraph>
        {deleteModal?.requires2FA !== false ? (
          <>
            <Paragraph type="secondary">
              A confirmation code will be emailed to{' '}
              <Text code>support.uzeats@gmail.com</Text>. Request the code, then enter it below.
            </Paragraph>
            {deleteModal?.statusMessage && (
              <Paragraph type="success">{deleteModal.statusMessage}</Paragraph>
            )}
            <Input
              placeholder="6-digit confirmation code"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              maxLength={6}
              style={{ maxWidth: 220 }}
            />
          </>
        ) : (
          <Paragraph type="warning">
            2FA for user deletion is disabled in platform config. Confirm to delete immediately.
          </Paragraph>
        )}
      </Modal>

      <Modal
        title={`Password reset — ${resetModal?.name ?? ''}`}
        open={Boolean(resetModal)}
        onCancel={() => setResetModal(null)}
        footer={null}
        destroyOnClose
      >
        <Paragraph type="secondary">
          Email a reset link to {resetModal?.email ?? 'the user'}, or copy a URL for support chat.
        </Paragraph>
        <Space wrap style={{ marginBottom: 16 }}>
          <Button type="primary" loading={resetting} onClick={() => runReset(true)}>
            Email reset link
          </Button>
          <Button loading={resetting} onClick={() => runReset(false)}>
            Generate link only
          </Button>
        </Space>
        {resetModal?.resetUrl && (
          <Card size="small">
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {resetModal.message}
            </Text>
            <Input.TextArea value={resetModal.resetUrl} autoSize={{ minRows: 2 }} readOnly />
            <Button
              icon={<CopyOutlined />}
              style={{ marginTop: 12 }}
              onClick={async () => {
                await navigator.clipboard.writeText(resetModal.resetUrl!);
                message.success('Copied');
              }}
            >
              Copy URL
            </Button>
          </Card>
        )}
      </Modal>

      <Modal
        title={
          editingUser
            ? `Edit account — ${editingUser.firstName} ${editingUser.lastName}`
            : 'Edit account'
        }
        open={Boolean(editingUser)}
        onCancel={() => setEditingUser(null)}
        onOk={onSaveUser}
        confirmLoading={savingUser}
        destroyOnClose
        okText="Save changes"
        width={560}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Enter a valid email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })}>
            <PhoneInput />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLES} />
          </Form.Item>
          <Form.Item name="loyaltyPoints" label="Loyalty points" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="restaurantIds" label="Assigned restaurants">
            <Select
              mode="multiple"
              options={restaurantOptions}
              optionFilterProp="label"
              placeholder="Optional venue access"
            />
          </Form.Item>
          <Form.Item name="emailVerified" label="Email verified" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="phoneVerified" label="Phone verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Invite staff"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={onInvite}
        confirmLoading={inviting}
        destroyOnClose
      >
        <Form form={inviteForm} layout="vertical" initialValues={{ role: 'staff' }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'restaurant_owner', label: 'Restaurant owner' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="restaurantIds"
            label="Restaurants"
            rules={[{ required: true, message: 'Select at least one restaurant' }]}
          >
            <Select mode="multiple" options={restaurantOptions} optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={assignUser ? `Assign venues — ${assignUser.firstName} ${assignUser.lastName}` : ''}
        open={Boolean(assignUser)}
        onCancel={() => setAssignUser(null)}
        onOk={onAssign}
        confirmLoading={assigning}
        destroyOnClose
      >
        <Form
          form={assignForm}
          layout="vertical"
          initialValues={{
            restaurantIds: assignUser?.restaurantIds ?? [],
            role: assignUser?.role === 'diner' ? 'staff' : assignUser?.role,
          }}
        >
          <Form.Item name="role" label="Role">
            <Select
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'restaurant_owner', label: 'Restaurant owner' },
              ]}
            />
          </Form.Item>
          <Form.Item name="restaurantIds" label="Restaurants" rules={[{ required: true }]}>
            <Select mode="multiple" options={restaurantOptions} optionFilterProp="label" />
          </Form.Item>
        </Form>
      </Modal>
    </></div>
  );
}

export default function AdminUsersPage() {
  return (
    <div component="AdminUsersPage" style={{ display: 'contents' }}><Suspense fallback={null}>
      <AdminUsersPageContent />
    </Suspense></div>
  );
}
