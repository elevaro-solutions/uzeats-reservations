'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { CUISINES } from '@reservations/shared';
import {
  AddressAutocomplete,
  PageHeader,
  PhoneInput,
  StatusTag,
  colors,
  spacing,
  usPhoneRules,
} from '@reservations/ui';
import PhotoUpload from '@/components/PhotoUpload';
import {
  ADMIN_RESTAURANTS,
  ADMIN_CREATE_RESTAURANT,
  ADMIN_DELETE_RESTAURANT,
  ADMIN_UPDATE_RESTAURANT,
  ADMIN_USERS,
  ASSIGN_USER_RESTAURANTS,
  CHANGE_PLAN,
  CREATE_SUBSCRIPTION,
  PLANS,
  REMOVE_USER_RESTAURANT,
  RESTAURANT_TEAM,
  SET_RESTAURANT_STATUS,
} from '@/lib/graphql';
import { addressSelectionToFields } from '@/lib/address';
import {
  priceRangeOptions,
  restaurantFieldTooltips as tips,
} from '@/lib/restaurantFormTooltips';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { isPlatformAdmin, isSuperAdmin } from '@/lib/roles';
import { useUrlPagination } from '@/lib/useUrlPagination';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const TEAM_ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'restaurant_owner', label: 'Restaurant owner' },
];

type RestaurantRecord = {
  id: string;
  name: string;
  slug?: string;
  status: string;
  cuisine: string;
  description?: string | null;
  priceRange: number;
  phone?: string | null;
  website?: string | null;
  photos?: string[];
  ownerId: string;
  featured?: boolean;
  featuredUntil?: string | null;
  depositRequired?: boolean;
  depositAmountCents?: number;
  loyaltyEnabled?: boolean;
  loyaltyPointsPerVisit?: number;
  loyaltyMinRedeemPoints?: number;
  spendAlertThresholdCents?: number;
  useSmartAssign?: boolean;
  posEnabled?: boolean;
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  location?: { lat?: number; lng?: number };
  widgetTheme?: {
    primaryColor?: string;
    buttonText?: string;
    showReviews?: boolean;
  };
  subscription?: {
    id: string;
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    monthlyPriceCents?: number;
  } | null;
};

type TeamMember = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

function formatPlanLabel(planKey: string, plans: Array<{ key: string; name: string }>) {
  const match = plans.find((p) => p.key === planKey);
  return match?.name ?? planKey;
}

function AdminRestaurantsContent() {
  const { ready, user } = useRequireAdmin();
  const canDeleteRestaurants = user ? isSuperAdmin(user.role) : false;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const { limit, offset, setPagination, tablePagination } = useUrlPagination({
    defaultPageSize: 20,
  });
  const { data, refetch, loading } = useQuery(ADMIN_RESTAURANTS, {
    skip: !ready,
    variables: {
      search: search || undefined,
      status: statusFilter,
      limit,
      offset,
    },
  });
  const { data: usersData } = useQuery(ADMIN_USERS, {
    skip: !ready,
    variables: { limit: 500, offset: 0 },
  });
  const { data: plansData } = useQuery(PLANS, { skip: !ready });

  const [setStatus] = useMutation(SET_RESTAURANT_STATUS);
  const [createRestaurant, { loading: creating }] = useMutation(ADMIN_CREATE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant created');
      closeCreate();
      refetch();
    },
  });
  const [updateRestaurant, { loading: saving }] = useMutation(ADMIN_UPDATE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant updated');
      setEditing(null);
      refetch();
    },
  });
  const [deleteRestaurant, { loading: deleting }] = useMutation(ADMIN_DELETE_RESTAURANT, {
    onCompleted: () => {
      message.success('Restaurant deleted');
      refetch();
    },
  });
  const [createSubscription, { loading: assigningPlan }] = useMutation(CREATE_SUBSCRIPTION);
  const [changePlan, { loading: changingPlan }] = useMutation(CHANGE_PLAN);
  const [assignUserRestaurants, { loading: assigningUser }] = useMutation(ASSIGN_USER_RESTAURANTS);
  const [removeUserRestaurant] = useMutation(REMOVE_USER_RESTAURANT);

  const [editing, setEditing] = useState<RestaurantRecord | null>(null);
  const [editTab, setEditTab] = useState('details');
  const [showCreate, setShowCreate] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [assignUserId, setAssignUserId] = useState<string>();
  const [assignRole, setAssignRole] = useState('staff');

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  const plans = (plansData?.plans ?? []) as Array<{ key: string; name: string; trialDays?: number }>;
  const planOptions = plans.map((p) => ({ value: p.key, label: p.name }));

  const { data: teamData, refetch: refetchTeam } = useQuery(RESTAURANT_TEAM, {
    skip: !editing?.id,
    variables: { restaurantId: editing?.id ?? '' },
  });

  const ownerOptions = (usersData?.adminUsers?.items ?? [])
    .filter(
      (u: { role: string }) =>
        u.role === 'restaurant_owner' || isPlatformAdmin(u.role) || u.role === 'staff',
    )
    .map((u: { id: string; firstName: string; lastName: string; email?: string }) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''}`,
    }));

  const assignableUserOptions = (usersData?.adminUsers?.items ?? [])
    .filter((u: { id: string; role: string }) => {
      if (isPlatformAdmin(u.role)) return false;
      const teamIds = (teamData?.restaurantTeam ?? []).map((m: { id: string }) => m.id);
      return !teamIds.includes(u.id);
    })
    .map((u: { id: string; firstName: string; lastName: string; email?: string; role: string }) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ''} — ${u.role}`,
    }));

  useEffect(() => {
    if (!editing) return;
    setEditTab('details');
    setPhotos(editing.photos ?? []);
    setSelectedPlan(editing.subscription?.plan);
    form.setFieldsValue({
      name: editing.name,
      description: editing.description ?? '',
      cuisine: editing.cuisine,
      priceRange: editing.priceRange,
      phone: editing.phone ?? '',
      website: editing.website ?? '',
      depositRequired: editing.depositRequired,
      depositAmountCents: editing.depositAmountCents
        ? editing.depositAmountCents / 100
        : 0,
      loyaltyEnabled: Boolean(editing.loyaltyEnabled),
      loyaltyPointsPerVisit: editing.loyaltyPointsPerVisit ?? 50,
      loyaltyMinRedeemPoints: editing.loyaltyMinRedeemPoints ?? 200,
      featured: Boolean(editing.featured),
      ownerId: editing.ownerId,
      line1: editing.address?.line1,
      line2: editing.address?.line2 ?? '',
      city: editing.address?.city,
      state: editing.address?.state,
      zip: editing.address?.zip,
      country: editing.address?.country ?? 'US',
      lat: editing.location?.lat,
      lng: editing.location?.lng,
      useSmartAssign: editing.useSmartAssign ?? false,
      posEnabled: editing.posEnabled ?? false,
      spendAlertDollars: (editing.spendAlertThresholdCents ?? 0) / 100,
      primaryColor: editing.widgetTheme?.primaryColor ?? colors.brand[600],
      buttonText: editing.widgetTheme?.buttonText ?? 'Reserve a table',
      showReviews: editing.widgetTheme?.showReviews ?? true,
    });
  }, [editing, form]);

  const closeCreate = () => {
    setShowCreate(false);
    createForm.resetFields();
    setPhotos([]);
  };

  const buildRestaurantInput = (values: Record<string, unknown>, photoList: string[]) => ({
    name: values.name,
    description: values.description || undefined,
    cuisine: values.cuisine,
    priceRange: values.priceRange,
    phone: values.phone || undefined,
    website: values.website || undefined,
    depositRequired: Boolean(values.depositRequired),
    depositAmountCents: Math.round((Number(values.depositAmountCents) || 0) * 100),
    loyaltyEnabled: Boolean(values.loyaltyEnabled),
    loyaltyPointsPerVisit: Number(values.loyaltyPointsPerVisit) || 50,
    loyaltyMinRedeemPoints: Number(values.loyaltyMinRedeemPoints) || 200,
    photos: photoList,
    address: {
      line1: values.line1,
      line2: values.line2 || undefined,
      city: values.city,
      state: values.state,
      zip: values.zip,
      country: values.country || 'US',
    },
    location: {
      lat: Number(values.lat),
      lng: Number(values.lng),
    },
  });

  const onSave = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await updateRestaurant({
        variables: {
          id: editing.id,
          featured: values.featured,
          ownerId: values.ownerId,
          spendAlertThresholdCents: Math.round((Number(values.spendAlertDollars) || 0) * 100),
          useSmartAssign: Boolean(values.useSmartAssign),
          posEnabled: Boolean(values.posEnabled),
          widgetTheme: {
            primaryColor: values.primaryColor,
            buttonText: values.buttonText,
            showReviews: Boolean(values.showReviews),
          },
          input: buildRestaurantInput(values, photos),
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to update restaurant');
    }
  };

  const onCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await createRestaurant({
        variables: {
          ownerId: values.ownerId,
          plan: values.plan || undefined,
          status: values.status || 'approved',
          input: buildRestaurantInput(values, photos),
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(err instanceof Error ? err.message : 'Failed to create restaurant');
    }
  };

  const applyPlan = async () => {
    if (!editing || !selectedPlan) return;
    try {
      if (editing.subscription) {
        await changePlan({
          variables: { restaurantId: editing.id, plan: selectedPlan },
        });
        message.success('Package updated');
      } else {
        await createSubscription({
          variables: { restaurantId: editing.id, plan: selectedPlan },
        });
        message.success('Package assigned');
      }
      const refreshed = await refetch();
      const updated = refreshed.data?.adminRestaurants?.items?.find(
        (r: RestaurantRecord) => r.id === editing.id,
      );
      if (updated) setEditing(updated);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to update package');
    }
  };

  const handleAssignUser = async () => {
    if (!editing || !assignUserId) return;
    try {
      await assignUserRestaurants({
        variables: {
          userId: assignUserId,
          restaurantIds: [editing.id],
          role: assignRole,
        },
      });
      message.success('Account assigned');
      setAssignUserId(undefined);
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to assign account');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!editing) return;
    try {
      await removeUserRestaurant({
        variables: { userId, restaurantId: editing.id },
      });
      message.success('Account removed');
      await refetchTeam();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  if (!ready) return null;

  const restaurantFormFields = (formInstance: typeof form, isCreate = false) => (
  <>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]} tooltip={tips.name}>
          <Input maxLength={120} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="cuisine" label="Cuisine" rules={[{ required: true }]} tooltip={tips.cuisine}>
          <Select options={CUISINES.map((c) => ({ value: c, label: c }))} showSearch />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="description" label="Description" tooltip={tips.description}>
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="priceRange" label="Price range" rules={[{ required: true }]} tooltip={tips.priceRange}>
          <Select options={priceRangeOptions} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="phone" label="Phone" rules={usPhoneRules({ required: false })} tooltip={tips.phone}>
          <PhoneInput />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="website" label="Website" tooltip={tips.website}>
          <Input placeholder="https://" />
        </Form.Item>
      </Col>
      {!isCreate && (
        <Col span={12}>
          <Form.Item name="ownerId" label="Owner" rules={[{ required: true }]}>
            <Select
              options={ownerOptions}
              showSearch
              optionFilterProp="label"
              placeholder="Select owner account"
            />
          </Form.Item>
        </Col>
      )}
      <Col span={24}>
        <Form.Item label="Photos">
          <PhotoUpload value={photos} onChange={setPhotos} maxCount={10} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Address search">
          <AddressAutocomplete
            onSelect={(selection) => {
              formInstance.setFieldsValue(addressSelectionToFields(selection));
            }}
          />
        </Form.Item>
      </Col>
      <Col span={16}>
        <Form.Item name="line1" label="Street" rules={[{ required: true }]} tooltip={tips.line1}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="line2" label="Apt / suite">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="city" label="City" rules={[{ required: true }]} tooltip={tips.city}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="state" label="State" rules={[{ required: true }]} tooltip={tips.state}>
          <Input maxLength={2} />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="zip" label="ZIP" rules={[{ required: true }]} tooltip={tips.zip}>
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="lat" label="Latitude" rules={[{ required: true }]} tooltip={tips.lat}>
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="lng" label="Longitude" rules={[{ required: true }]} tooltip={tips.lng}>
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="depositRequired"
          label="Deposit required"
          valuePropName="checked"
          tooltip={tips.depositRequired}
        >
          <Switch />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="depositAmountCents" label="Deposit amount (USD)" tooltip={tips.depositAmountCents}>
          <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="loyaltyEnabled"
          label="Loyalty program"
          valuePropName="checked"
          tooltip={tips.loyaltyEnabled}
        >
          <Switch />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="loyaltyPointsPerVisit" label="Points per visit" tooltip={tips.loyaltyPointsPerVisit}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="loyaltyMinRedeemPoints" label="Min redeem points" tooltip={tips.loyaltyMinRedeemPoints}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      {!isCreate && (
        <>
          <Col span={12}>
            <Form.Item name="featured" label="Featured listing" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="useSmartAssign" label="Smart assign" valuePropName="checked" tooltip={tips.useSmartAssign}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="posEnabled" label="POS enabled" valuePropName="checked" tooltip={tips.posEnabled}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="spendAlertDollars" label="Spend alert (USD)" tooltip={tips.spendAlertDollars}>
              <InputNumber min={0} step={1} style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="primaryColor" label="Widget color" tooltip={tips.primaryColor}>
              <Input placeholder="#0b3d2e" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="buttonText" label="Widget button text" tooltip={tips.buttonText}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="showReviews" label="Show reviews on widget" valuePropName="checked" tooltip={tips.showReviews}>
              <Switch />
            </Form.Item>
          </Col>
        </>
      )}
      <Form.Item name="country" hidden>
        <Input />
      </Form.Item>
    </Row>
  </>
  );

  return (
    <div component="AdminRestaurantsContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Restaurants"
          subtitle="Create venues, assign packages and accounts, and manage full restaurant profiles."
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
              Add restaurant
            </Button>
          }
        />
        <Card>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Input
                placeholder="Search name, cuisine, or location..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination(1);
                }}
                allowClear
                style={{ width: 300 }}
              />
              <Select
                placeholder="Status"
                allowClear
                style={{ width: 160 }}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPagination(1);
                }}
                options={STATUS_OPTIONS}
              />
            </Space>
            <Table
              loading={loading}
              rowKey="id"
              dataSource={data?.adminRestaurants?.items ?? []}
              pagination={tablePagination(data?.adminRestaurants?.total ?? 0, {
                showSizeChanger: true,
              })}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                { title: 'Cuisine', dataIndex: 'cuisine' },
                {
                  title: 'Location',
                  render: (_: unknown, r: RestaurantRecord) =>
                    `${r.address?.city ?? ''}, ${r.address?.state ?? ''}`,
                },
                {
                  title: 'Package',
                  render: (_: unknown, r: RestaurantRecord) => {
                    if (!r.subscription) return <Text type="secondary">None</Text>;
                    return (
                      <Space size={4}>
                        <Tag>{formatPlanLabel(r.subscription.plan, plans)}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {r.subscription.status}
                        </Text>
                      </Space>
                    );
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (s: string) => <StatusTag status={s} />,
                },
                {
                  title: 'Actions',
                  width: 320,
                  render: (_: unknown, r: RestaurantRecord) => (
                    <Space wrap>
                      <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(r)}>
                        Edit
                      </Button>
                      {r.status !== 'approved' && (
                        <Button
                          type="primary"
                          size="small"
                          onClick={async () => {
                            await setStatus({ variables: { id: r.id, status: 'approved' } });
                            message.success('Approved');
                            refetch();
                          }}
                        >
                          Approve
                        </Button>
                      )}
                      {r.status !== 'rejected' && (
                        <Button
                          danger
                          size="small"
                          onClick={async () => {
                            await setStatus({ variables: { id: r.id, status: 'rejected' } });
                            refetch();
                          }}
                        >
                          Reject
                        </Button>
                      )}
                      {r.status === 'approved' && (
                        <Button
                          size="small"
                          onClick={async () => {
                            await setStatus({ variables: { id: r.id, status: 'suspended' } });
                            refetch();
                          }}
                        >
                          Suspend
                        </Button>
                      )}
                      {canDeleteRestaurants && (
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deleting}
                          onClick={() => {
                            Modal.confirm({
                              title: `Delete ${r.name}?`,
                              content:
                                'Permanently deletes this restaurant and all related records. This cannot be undone.',
                              okText: 'Delete permanently',
                              okButtonProps: { danger: true },
                              onOk: async () => {
                                await deleteRestaurant({ variables: { id: r.id } });
                              },
                            });
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        </Card>

        <Modal
          title="Add restaurant"
          open={showCreate}
          onCancel={closeCreate}
          onOk={onCreate}
          confirmLoading={creating}
          width={760}
          destroyOnClose
          okText="Create restaurant"
        >
          <Form
            form={createForm}
            layout="vertical"
            initialValues={{
              status: 'approved',
              priceRange: 2,
              lat: 40.7128,
              lng: -74.006,
              depositRequired: false,
              depositAmountCents: 0,
              loyaltyEnabled: false,
              loyaltyPointsPerVisit: 50,
              loyaltyMinRedeemPoints: 200,
              country: 'US',
            }}
          >
            <Divider titlePlacement="left" plain>Account & package</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ownerId" label="Owner account" rules={[{ required: true }]}>
                  <Select
                    options={ownerOptions}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Assign owner"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="plan" label="Package">
                  <Select
                    options={planOptions}
                    allowClear
                    placeholder="Optional — assign billing package"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Initial status" rules={[{ required: true }]}>
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Divider titlePlacement="left" plain>Restaurant details</Divider>
            {restaurantFormFields(createForm, true)}
          </Form>
        </Modal>

        <Modal
          title={editing ? `Manage — ${editing.name}` : 'Manage restaurant'}
          open={Boolean(editing)}
          onCancel={() => setEditing(null)}
          width={800}
          destroyOnClose
          footer={
            editTab === 'details'
              ? [
                  <Button key="cancel" onClick={() => setEditing(null)}>Cancel</Button>,
                  <Button key="save" type="primary" loading={saving} onClick={onSave}>
                    Save changes
                  </Button>,
                ]
              : [
                  <Button key="close" onClick={() => setEditing(null)}>Close</Button>,
                ]
          }
        >
          <Tabs
            activeKey={editTab}
            onChange={setEditTab}
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <Form form={form} layout="vertical">
                    {restaurantFormFields(form)}
                  </Form>
                ),
              },
              {
                key: 'package',
                label: 'Package',
                children: (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    {editing?.subscription ? (
                      <Card size="small" styles={{ body: { padding: spacing.md } }}>
                        <Space orientation="vertical" size={4}>
                          <Text strong>Current package</Text>
                          <Text>
                            {formatPlanLabel(editing.subscription.plan, plans)}
                            <Tag style={{ marginLeft: 8 }}>{editing.subscription.status}</Tag>
                          </Text>
                          {editing.subscription.trialEndsAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Trial ends {new Date(editing.subscription.trialEndsAt).toLocaleDateString()}
                            </Text>
                          )}
                        </Space>
                      </Card>
                    ) : (
                      <Text type="secondary">No billing package assigned yet.</Text>
                    )}
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {editing?.subscription ? 'Change package' : 'Assign package'}
                      </Text>
                      <Space wrap>
                        <Select
                          style={{ width: 220 }}
                          placeholder="Select package"
                          value={selectedPlan}
                          onChange={setSelectedPlan}
                          options={planOptions}
                        />
                        <Button
                          type="primary"
                          loading={assigningPlan || changingPlan}
                          disabled={!selectedPlan}
                          onClick={applyPlan}
                        >
                          {editing?.subscription ? 'Update package' : 'Assign package'}
                        </Button>
                      </Space>
                    </div>
                  </Space>
                ),
              },
              {
                key: 'team',
                label: 'Accounts',
                children: (
                  <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Table<TeamMember>
                      size="small"
                      rowKey="id"
                      dataSource={(teamData?.restaurantTeam ?? []) as TeamMember[]}
                      pagination={false}
                      columns={[
                        {
                          title: 'Name',
                          render: (_: unknown, member) => `${member.firstName} ${member.lastName}`,
                        },
                        { title: 'Email', dataIndex: 'email' },
                        {
                          title: 'Role',
                          dataIndex: 'role',
                          render: (role: string, record) => (
                            <Space>
                              <Tag>{role}</Tag>
                              {record.id === editing?.ownerId && <Tag color="blue">Owner</Tag>}
                            </Space>
                          ),
                        },
                        {
                          title: '',
                          width: 100,
                          render: (_: unknown, record) =>
                            record.id !== editing?.ownerId ? (
                              <Button
                                size="small"
                                danger
                                onClick={() => handleRemoveUser(record.id)}
                              >
                                Remove
                              </Button>
                            ) : null,
                        },
                      ]}
                    />
                    <Divider plain>Assign account</Divider>
                    <Space wrap align="start">
                      <Select
                        style={{ width: 280 }}
                        placeholder="Select user to assign"
                        value={assignUserId}
                        onChange={setAssignUserId}
                        options={assignableUserOptions}
                        showSearch
                        optionFilterProp="label"
                      />
                      <Select
                        style={{ width: 160 }}
                        value={assignRole}
                        onChange={setAssignRole}
                        options={TEAM_ROLE_OPTIONS}
                      />
                      <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        loading={assigningUser}
                        disabled={!assignUserId}
                        onClick={handleAssignUser}
                      >
                        Assign
                      </Button>
                    </Space>
                  </Space>
                ),
              },
            ]}
          />
        </Modal>
      </Space>
    </div>
  );
}

export default function AdminRestaurantsPage() {
  return (
    <div component="AdminRestaurantsPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminRestaurantsContent />
      </Suspense>
    </div>
  );
}
