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
  Tag,
  Typography,
  message,
  Alert,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  MailOutlined,
  MoreOutlined,
  SearchOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { PageHeader, PhoneInput, spacing, usPhoneRules } from '@reservations/ui';
import {
  ADMIN_CREATE_USER,
  ADMIN_DELETE_USER,
  ADMIN_RESTAURANTS,
  ADMIN_SEND_PASSWORD_RESET,
  ADMIN_UPDATE_USER,
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  INVITE_MANAGER,
  PLATFORM_CONFIG,
  REQUEST_ADMIN_DELETE_USER_CODE,
  SET_USER_ROLE,
  START_IMPERSONATION,
  EXPORT_ADMIN_DINERS,
  EXPORT_ADMIN_USERS,
} from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin, isSuperAdmin, canEditUser } from '@/lib/roles';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useUrlListFilters } from '@/lib/useUrlListFilters';
import { useUrlPagination } from '@/lib/useUrlPagination';
import {
  ACCOUNT_KIND_META,
  PLATFORM_ROLE_OPTIONS,
  RESTAURANT_ACCOUNT_ROLE_OPTIONS,
  ROLE_LABELS,
  PASSWORD_FORM_RULES,
  accountDetailPath,
  type AccountKind,
  type AccountRecord,
} from '@/lib/adminAccounts';
import { ExportMenu, type ListExportFormat } from '@/components/ExportMenu';
import { downloadExportPayload } from '@/lib/downloadExport';
import { useFormDirty } from '@/lib/useFormDirty';
import { RolesCapabilitiesModal } from '@/components/RolesCapabilitiesModal';
import { getPublicWebUrl } from '@/lib/webUrl';

const { Paragraph, Text } = Typography;

type Props = {
  kind: AccountKind;
};

function AdminAccountsListContent({ kind }: Props) {
  const meta = ACCOUNT_KIND_META[kind];
  const { ready } = useRequireAdmin();
  const { user, beginImpersonation } = useAuth();
  const canDeleteUsers = user ? isSuperAdmin(user.role) : false;
  const canEditRecord = (record: { role: string }) =>
    user ? canEditUser(user.role, record.role) : false;
  const usesMultiRoleFilters = kind === 'platform' || kind === 'restaurant_owner';
  const {
    search,
    searchQuery,
    setSearch,
    role: roleFilter,
    setRole,
    restaurant: restaurantFilter,
    setRestaurant,
    venues: venuesFilter,
    setVenues,
  } = useUrlListFilters({
    search: 'q',
    ...(usesMultiRoleFilters
      ? {
          role: 'role',
          ...(kind === 'restaurant_owner'
            ? { restaurant: 'restaurant', venues: 'venues' }
            : {}),
        }
      : {}),
  });
  const [rolesGuideOpen, setRolesGuideOpen] = useState(false);
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
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<AccountRecord | null>(null);
  const [editingUser, setEditingUser] = useState<AccountRecord | null>(null);
  const [createForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const editDirty = useFormDirty();
  const createDirty = useFormDirty();
  const inviteDirty = useFormDirty();
  const assignDirty = useFormDirty();
  const createRole = Form.useWatch('role', createForm);
  const { limit, offset, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { data, loading, refetch } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: {
      search: searchQuery || undefined,
      role: usesMultiRoleFilters
        ? roleFilter || undefined
        : meta.role,
      roles: usesMultiRoleFilters
        ? roleFilter
          ? undefined
          : meta.roles
        : undefined,
      restaurantId:
        kind === 'restaurant_owner' ? restaurantFilter || undefined : undefined,
      hasRestaurants:
        kind === 'restaurant_owner'
          ? venuesFilter === 'assigned'
            ? true
            : venuesFilter === 'none'
              ? false
              : undefined
          : undefined,
      limit,
      offset,
    },
  });
  const { data: restaurantsData } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready || (!meta.showRestaurants && !meta.allowRestaurantsOnCreate && !meta.showInvite),
    variables: { limit: 200, offset: 0 },
  });
  const { data: configData } = useQuery(PLATFORM_CONFIG, { skip: !ready });
  const [setUserRole] = useMutation(SET_USER_ROLE, { onCompleted: () => refetch() });
  const [sendReset, { loading: resetting }] = useMutation(ADMIN_SEND_PASSWORD_RESET);
  const [startImpersonation, { loading: impersonating }] = useMutation(START_IMPERSONATION);
  const [inviteManager, { loading: inviting }] = useMutation(INVITE_MANAGER);
  const [createAccount, { loading: creating }] = useMutation(ADMIN_CREATE_USER, {
    onCompleted: () => {
      message.success(`${meta.singular} created`);
      setCreateOpen(false);
      createForm.resetFields();
      refetch();
    },
  });
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
  const [exportDiners, { loading: exportingDiners }] = useMutation(EXPORT_ADMIN_DINERS);
  const [exportUsers, { loading: exportingUsers }] = useMutation(EXPORT_ADMIN_USERS);

  if (!ready) return null;

  const hasSuperAdmin = data?.adminUsers?.hasSuperAdmin ?? false;
  const requireDelete2FA = configData?.platformConfig?.requireAdminDelete2FA !== false;
  const restaurantOptions = (restaurantsData?.adminRestaurants?.items ?? []).map((r: { id: string; name: string }) => ({
    value: r.id,
    label: r.name,
  }));
  const platformRoleSelectOptions =
    (user && isSuperAdmin(user.role)) || !hasSuperAdmin
      ? PLATFORM_ROLE_OPTIONS
      : PLATFORM_ROLE_OPTIONS.filter((option) => option.value === 'account_manager');
  const platformCreateRoleOptions = platformRoleSelectOptions.filter(
    (option) => option.value !== 'super_admin',
  );
  const listRoleOptions: Array<{ value: string; label: string }> =
    kind === 'restaurant_owner' ? RESTAURANT_ACCOUNT_ROLE_OPTIONS : platformRoleSelectOptions;
  const createRoleOptions: Array<{ value: string; label: string }> =
    kind === 'restaurant_owner' ? RESTAURANT_ACCOUNT_ROLE_OPTIONS : platformCreateRoleOptions;
  const exporting = exportingDiners || exportingUsers;

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await setUserRole({ variables: { userId, role } });
      message.success('Role updated');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update role');
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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to create reset link');
    }
  };

  const onImpersonate = async (record: AccountRecord) => {
    try {
      const res = await startImpersonation({ variables: { userId: record.id } });
      const payload = res.data?.startImpersonation;
      beginImpersonation(payload.user, payload.impersonator);
      message.success(`Viewing as ${payload.user.firstName}`);
      if (payload.user.role === 'diner') {
        window.location.href = getPublicWebUrl();
      } else {
        window.location.href = '/';
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Impersonation failed');
    }
  };

  const openEdit = (record: AccountRecord) => {
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
    editDirty.clearDirty();
  };

  const onSaveUser = async () => {
    if (!editDirty.dirty) return;
    try {
      const values = await editForm.validateFields();
      await updateUser({
        variables: {
          userId: editingUser!.id,
          input: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email || undefined,
            phone: values.phone || undefined,
            role: values.role ?? editingUser!.role,
            loyaltyPoints: meta.showLoyalty ? values.loyaltyPoints : undefined,
            emailVerified: values.emailVerified,
            phoneVerified: values.phoneVerified,
            restaurantIds: meta.showRestaurants ? (values.restaurantIds ?? []) : undefined,
          },
        },
      });
      editDirty.clearDirty();
      setEditingUser(null);
      message.success('Account updated');
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const onCreate = async () => {
    if (!createDirty.dirty) return;
    try {
      const values = await createForm.validateFields();
      const role =
        values.role ?? meta.role ?? (kind === 'platform' ? 'admin' : 'restaurant_owner');
      if (role === 'manager' && !(values.restaurantIds ?? []).length) {
        message.error('Managers require at least one restaurant');
        return;
      }
      await createAccount({
        variables: {
          input: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone || undefined,
            password: values.password,
            role,
            restaurantIds: values.restaurantIds ?? [],
            emailVerified: values.emailVerified ?? false,
          },
        },
      });
      createDirty.clearDirty();
      setCreateOpen(false);
      createForm.resetFields();
      message.success('Account created');
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const onInvite = async () => {
    if (!inviteDirty.dirty) return;
    try {
      const values = await inviteForm.validateFields();
      const res = await inviteManager({
        variables: {
          ...values,
          role: values.role ?? (kind === 'restaurant_owner' ? 'restaurant_owner' : 'manager'),
        },
      });
      message.success(`Invited ${res.data?.inviteManager?.email}`);
      Modal.info({
        title: 'Invite sent',
        content: (
          <div>
            <Paragraph>Share this link if the email does not arrive:</Paragraph>
            <Input.TextArea value={res.data?.inviteManager?.inviteUrl} autoSize readOnly />
          </div>
        ),
      });
      setInviteOpen(false);
      inviteForm.resetFields();
      inviteDirty.clearDirty();
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Invite failed');
    }
  };

  const onAssign = async () => {
    if (!assignDirty.dirty) return;
    try {
      const values = await assignForm.validateFields();
      await assignRestaurants({
        variables: {
          userId: assignUser!.id,
          restaurantIds: values.restaurantIds,
          role: values.role,
        },
      });
      message.success('Restaurants assigned');
      assignDirty.clearDirty();
      setAssignUser(null);
      refetch();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Assign failed');
    }
  };

  const onExportDiners = async (format: ListExportFormat) => {
    try {
      const res = await exportDiners({
        variables: { search: searchQuery || undefined, format },
      });
      const payload = res.data?.exportAdminDiners;
      if (!payload?.content) throw new Error('No export returned');
      downloadExportPayload(payload);
      message.success(`Exported ${payload.rowCount} guests as ${format === 'xlsx' ? 'Excel' : format.toUpperCase()}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const onExportUsers = async (format: ListExportFormat) => {
    try {
      const res = await exportUsers({
        variables: {
          search: searchQuery || undefined,
          role: usesMultiRoleFilters ? roleFilter || undefined : meta.role,
          roles: usesMultiRoleFilters ? (roleFilter ? undefined : meta.roles) : undefined,
          restaurantId:
            kind === 'restaurant_owner' ? restaurantFilter || undefined : undefined,
          hasRestaurants:
            kind === 'restaurant_owner'
              ? venuesFilter === 'assigned'
                ? true
                : venuesFilter === 'none'
                  ? false
                  : undefined
              : undefined,
          format,
          basename: kind === 'platform' ? 'admins' : 'restaurant-accounts',
          title: meta.title,
        },
      });
      const payload = res.data?.exportAdminUsers;
      if (!payload?.content) throw new Error('No export returned');
      downloadExportPayload(payload);
      message.success(
        `Exported ${payload.rowCount} ${meta.title.toLowerCase()} as ${format === 'xlsx' ? 'Excel' : format.toUpperCase()}`,
      );
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const openDelete = (record: AccountRecord) => {
    setDeleteCode('');
    setDeleteModal({
      userId: record.id,
      name: `${record.firstName} ${record.lastName}`,
      email: record.email ?? undefined,
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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to send confirmation code');
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
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const actionItems = (record: AccountRecord): MenuProps['items'] => {
    const editable = canEditRecord(record);
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        disabled: !editable,
        onClick: () => openEdit(record),
      },
      {
        key: 'view-as',
        icon: <EyeOutlined />,
        label: 'View as',
        disabled: isPlatformAdmin(record.role) || impersonating,
        onClick: () => onImpersonate(record),
      },
      ...(meta.showRestaurants || kind === 'diner'
        ? [
            {
              key: 'assign',
              label: 'Assign venues',
              disabled: !editable,
              onClick: () => {
                assignForm.setFieldsValue({
                  restaurantIds: record.restaurantIds ?? [],
                  role:
                    record.role === 'diner'
                      ? kind === 'restaurant_owner'
                        ? 'restaurant_owner'
                        : 'manager'
                      : record.role,
                });
                assignDirty.clearDirty();
                setAssignUser(record);
              },
            },
          ]
        : []),
      {
        key: 'reset',
        icon: <MailOutlined />,
        label: 'Reset password',
        disabled: !editable || !record.email,
        onClick: () =>
          setResetModal({
            userId: record.id,
            name: `${record.firstName} ${record.lastName}`,
            email: record.email ?? undefined,
          }),
      },
      ...(canDeleteUsers
        ? [
            { type: 'divider' as const },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: 'Delete',
              danger: true,
              disabled: record.id === user?.id,
              onClick: () => openDelete(record),
            },
          ]
        : []),
    ];
  };

  return (
    <>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          extra={
            <Space wrap>
              {(kind === 'platform' || kind === 'restaurant_owner') && (
                <Button icon={<InfoCircleOutlined />} onClick={() => setRolesGuideOpen(true)}>
                  Roles & capabilities
                </Button>
              )}
              {(kind === 'diner' || kind === 'restaurant_owner' || kind === 'platform') && (
                <ExportMenu
                  formats={['xlsx', 'pdf', 'json']}
                  loading={exporting}
                  onExport={(format) =>
                    void (kind === 'diner' ? onExportDiners(format) : onExportUsers(format))
                  }
                />
              )}
              {meta.showInvite && (
                <Button
                  onClick={() => {
                    inviteDirty.clearDirty();
                    setInviteOpen(true);
                  }}
                >
                  Invite
                </Button>
              )}
              {meta.allowCreate && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    createDirty.clearDirty();
                    setCreateOpen(true);
                  }}
                >
                  {meta.createLabel}
                </Button>
              )}
            </Space>
          }
        />
        <Card>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {kind === 'platform' &&
              !hasSuperAdmin &&
              user &&
              isPlatformAdmin(user.role) &&
              !isSuperAdmin(user.role) && (
                <Alert
                  type="warning"
                  showIcon
                  message="No super admin yet"
                  description="Assign the Super Admin role to a platform admin account. After that, only super admins can grant admin or super admin roles."
                />
              )}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Input
                placeholder="Search by name, email, or phone..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ flex: '1 1 200px', minWidth: 180, maxWidth: 320 }}
              />
              {usesMultiRoleFilters ? (
                <>
                  <Select
                    allowClear
                    placeholder="All roles"
                    value={roleFilter}
                    onChange={(value) => setRole(value)}
                    options={listRoleOptions}
                    style={{ width: 140, flex: '0 0 auto' }}
                  />
                  {kind === 'restaurant_owner' ? (
                    <>
                      <Select
                        allowClear
                        placeholder="Venue access"
                        value={venuesFilter}
                        onChange={(value) => setVenues(value)}
                        options={[
                          { value: 'assigned', label: 'Has restaurants' },
                          { value: 'none', label: 'No restaurants' },
                        ]}
                        style={{ width: 150, flex: '0 0 auto' }}
                      />
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Restaurant"
                        value={restaurantFilter}
                        onChange={(value) => setRestaurant(value)}
                        options={restaurantOptions}
                        style={{ flex: '1 1 160px', minWidth: 140, maxWidth: 260 }}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
            <Table
              loading={loading}
              rowKey="id"
              scroll={{ x: 920 }}
              tableLayout="fixed"
              dataSource={data?.adminUsers?.items ?? []}
              pagination={tablePagination(data?.adminUsers?.total ?? 0, {
                showSizeChanger: true,
              })}
              columns={[
                {
                  title: 'Name',
                  width: 160,
                  render: (_: unknown, u: AccountRecord) => (
                    <Link href={accountDetailPath(u.role, u.id)}>
                      {u.firstName} {u.lastName}
                    </Link>
                  ),
                },
                { title: 'Email', dataIndex: 'email', ellipsis: true, width: 200 },
                {
                  title: 'Phone',
                  dataIndex: 'phone',
                  ellipsis: true,
                  width: 140,
                  render: (v: string) => v || '—',
                },
                ...(meta.showRoleColumn
                  ? [
                      {
                        title: 'Role',
                        dataIndex: 'role',
                        width: 140,
                        render: (role: string, record: AccountRecord) => {
                          const roleLabel = ROLE_LABELS[role] ?? role;
                          return canEditRecord(record) ? (
                            <Select
                              value={role}
                              options={listRoleOptions}
                              onChange={(val) => handleRoleChange(record.id, val)}
                              style={{ width: '100%' }}
                              popupMatchSelectWidth={false}
                              size="small"
                            />
                          ) : (
                            <Tag>{roleLabel}</Tag>
                          );
                        },
                      },
                    ]
                  : []),
                ...(meta.showLoyalty
                  ? [
                      {
                        title: 'Loyalty',
                        dataIndex: 'loyaltyPoints',
                        width: 100,
                        render: (v: number) => v ?? 0,
                      },
                    ]
                  : []),
                ...(meta.showRestaurants
                  ? [
                      {
                        title: 'Restaurants',
                        dataIndex: 'restaurantIds',
                        width: 120,
                        render: (ids: string[]) => {
                          const count = ids?.length ?? 0;
                          return (
                            <Tag color={count > 0 ? 'blue' : 'default'}>
                              {count}
                            </Tag>
                          );
                        },
                      },
                    ]
                  : []),
                {
                  title: 'Actions',
                  width: 100,
                  fixed: 'right' as const,
                  render: (_: unknown, record: AccountRecord) => (
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

      {(kind === 'platform' || kind === 'restaurant_owner') && (
        <RolesCapabilitiesModal
          kind={kind}
          open={rolesGuideOpen}
          onClose={() => setRolesGuideOpen(false)}
        />
      )}

      <Modal
        title={`Delete ${meta.singular.toLowerCase()} — ${deleteModal?.name ?? ''}`}
        open={Boolean(deleteModal)}
        onCancel={() => {
          setDeleteModal(null);
          setDeleteCode('');
        }}
        destroyOnHidden
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
              A confirmation code will be emailed to <Text code>support.uzeats@gmail.com</Text>.
              Request the code, then enter it below.
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
        destroyOnHidden
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
            ? `Edit ${meta.singular.toLowerCase()} — ${editingUser.firstName} ${editingUser.lastName}`
            : `Edit ${meta.singular.toLowerCase()}`
        }
        open={Boolean(editingUser)}
        onCancel={() => {
          setEditingUser(null);
          editDirty.clearDirty();
        }}
        onOk={onSaveUser}
        confirmLoading={savingUser}
        destroyOnHidden
        okText="Save changes"
        okButtonProps={{ disabled: !editDirty.dirty }}
        width={560}
      >
        <Form form={editForm} layout="vertical" onValuesChange={editDirty.onValuesChange}>
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
          {meta.showRoleColumn && (
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={listRoleOptions} />
            </Form.Item>
          )}
          {meta.showLoyalty && (
            <Form.Item name="loyaltyPoints" label="Loyalty points" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          {meta.showRestaurants && (
            <Form.Item name="restaurantIds" label="Assigned restaurants">
              <Select
                mode="multiple"
                options={restaurantOptions}
                optionFilterProp="label"
                placeholder="Optional venue access"
              />
            </Form.Item>
          )}
          <Form.Item name="emailVerified" label="Email verified" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="phoneVerified" label="Phone verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={meta.createLabel}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createDirty.clearDirty();
        }}
        onOk={onCreate}
        confirmLoading={creating}
        destroyOnHidden
        okText="Create account"
        okButtonProps={{ disabled: !createDirty.dirty }}
        width={560}
      >
        <Form
          form={createForm}
          layout="vertical"
          onValuesChange={createDirty.onValuesChange}
          initialValues={{ emailVerified: false }}
        >
          <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })}>
            <PhoneInput />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={PASSWORD_FORM_RULES}>
            <Input.Password />
          </Form.Item>
          {(kind === 'platform' || kind === 'restaurant_owner') && (
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: 'Select a role' }]}
              initialValue={kind === 'platform' ? 'admin' : 'restaurant_owner'}
            >
              <Select options={createRoleOptions} />
            </Form.Item>
          )}
          {meta.allowRestaurantsOnCreate && (
            <Form.Item
              name="restaurantIds"
              label="Restaurants"
              rules={
                meta.requireRestaurantsOnCreate || createRole === 'manager'
                  ? [{ required: true, message: 'Select at least one restaurant' }]
                  : undefined
              }
            >
              <Select
                mode="multiple"
                options={restaurantOptions}
                optionFilterProp="label"
                placeholder={
                  meta.requireRestaurantsOnCreate || createRole === 'manager'
                    ? 'Required venue access'
                    : 'Optional venue access'
                }
              />
            </Form.Item>
          )}
          <Form.Item name="emailVerified" label="Email verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Invite ${meta.singular.toLowerCase()}`}
        open={inviteOpen}
        onCancel={() => {
          setInviteOpen(false);
          inviteDirty.clearDirty();
        }}
        onOk={onInvite}
        confirmLoading={inviting}
        okButtonProps={{ disabled: !inviteDirty.dirty }}
        destroyOnHidden
      >
        <Form form={inviteForm} layout="vertical" onValuesChange={inviteDirty.onValuesChange}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {kind === 'restaurant_owner' && (
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true }]}
              initialValue="restaurant_owner"
            >
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

      <Modal
        title={assignUser ? `Assign venues — ${assignUser.firstName} ${assignUser.lastName}` : ''}
        open={Boolean(assignUser)}
        onCancel={() => {
          setAssignUser(null);
          assignDirty.clearDirty();
        }}
        onOk={onAssign}
        confirmLoading={assigning}
        okButtonProps={{ disabled: !assignDirty.dirty }}
        destroyOnHidden
      >
        <Form
          form={assignForm}
          layout="vertical"
          onValuesChange={assignDirty.onValuesChange}
          initialValues={{
            restaurantIds: assignUser?.restaurantIds ?? [],
            role:
              assignUser?.role === 'diner'
                ? kind === 'restaurant_owner'
                  ? 'restaurant_owner'
                  : 'manager'
                : assignUser?.role,
          }}
        >
          {kind === 'diner' && (
            <Form.Item name="role" label="Role">
              <Select options={RESTAURANT_ACCOUNT_ROLE_OPTIONS} />
            </Form.Item>
          )}
          {kind === 'restaurant_owner' && (
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={RESTAURANT_ACCOUNT_ROLE_OPTIONS} />
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

export function AdminAccountsList({ kind }: Props) {
  return (
    <Suspense fallback={null}>
      <AdminAccountsListContent kind={kind} />
    </Suspense>
  );
}
