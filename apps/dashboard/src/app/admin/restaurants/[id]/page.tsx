'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
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
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import { PageHeader, StatusTag, spacing } from '@reservations/ui';
import {
  AdminManageRestaurant,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import { AdminRestaurantInvoicesPanel } from '@/components/AdminRestaurantInvoicesPanel';
import { AdminRestaurantMenuPanel } from '@/components/AdminRestaurantMenuPanel';
import { AdminRestaurantReservationsPanel } from '@/components/AdminRestaurantReservationsPanel';
import {
  ADMIN_RESTAURANT,
  CREATE_SHIFT,
  CREATE_TABLE,
  DELETE_SHIFT,
  DELETE_TABLE,
  RESTAURANT_TEAM,
  UPDATE_SHIFT,
  UPDATE_TABLE,
} from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { getPublicWebUrl } from '@/lib/webUrl';
import { accountDetailPath } from '@/lib/adminAccounts';

const { Text, Title } = Typography;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type RestaurantDetail = AdminRestaurantRecord & {
  tables?: Array<{
    id: string;
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string;
    active?: boolean;
    combinable?: boolean;
    photoUrl?: string | null;
  }>;
  shifts?: Array<{
    id: string;
    name: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    slotIntervalMinutes: number;
    turnTimeMinutes: number;
    active?: boolean;
  }>;
  menu?: {
    sections?: Array<{
      name: string;
      items: Array<{
        name: string;
        description?: string | null;
        priceCents?: number;
        dietary?: string[];
        available?: boolean;
        photoUrl?: string | null;
      }>;
    }>;
  } | null;
};

function money(cents?: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function AdminRestaurantDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();
  const [tab, setTab] = useState('overview');
  const [previewKey, setPreviewKey] = useState(0);
  const [restaurantOverride, setRestaurantOverride] = useState<RestaurantDetail | null>(null);

  // Tables tab state
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [tableForm] = Form.useForm();

  // Shifts tab state
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [shiftForm] = Form.useForm();

  const { data, loading, refetch } = useQuery(ADMIN_RESTAURANT, {
    skip: !ready || !id,
    variables: { id },
  });

  const { data: teamData } = useQuery(RESTAURANT_TEAM, {
    skip: !ready || !id || !data?.restaurant,
    variables: { restaurantId: data?.restaurant?.id },
  });

  const [createTable] = useMutation(CREATE_TABLE);
  const [updateTable] = useMutation(UPDATE_TABLE);
  const [deleteTable] = useMutation(DELETE_TABLE);
  const [createShift] = useMutation(CREATE_SHIFT);
  const [updateShift] = useMutation(UPDATE_SHIFT);
  const [deleteShift] = useMutation(DELETE_SHIFT);

  const restaurant = (restaurantOverride ?? data?.restaurant ?? null) as RestaurantDetail | null;

  const dinerUrl = useMemo(() => {
    if (!restaurant) return null;
    return buildRestaurantBookingUrl(getPublicWebUrl(), {
      slug: restaurant.slug,
      id: restaurant.id,
    });
  }, [restaurant]);

  const addressLine = restaurant?.address
    ? [
        restaurant.address.line1,
        restaurant.address.line2,
        [restaurant.address.city, restaurant.address.state, restaurant.address.zip]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const menuItemCount = (restaurant?.menu?.sections ?? []).reduce(
    (n, s) => n + (s.items?.length ?? 0),
    0,
  );

  const refresh = async () => {
    const result = await refetch();
    if (result.data?.restaurant) {
      setRestaurantOverride(result.data.restaurant);
    }
    setPreviewKey((k) => k + 1);
  };

  const teamMembers = teamData?.restaurantTeam ?? [];
  const owner = restaurant?.ownerId
    ? teamMembers.find((m: any) => m.id === restaurant.ownerId)
    : null;

  const handleTableSubmit = async () => {
    try {
      const values = await tableForm.validateFields();
      if (editingTable) {
        await updateTable({ variables: { id: editingTable.id, input: values } });
        message.success('Table updated');
      } else {
        await createTable({ variables: { restaurantId: restaurant!.id, input: values } });
        message.success('Table created');
      }
      setTableModalOpen(false);
      setEditingTable(null);
      tableForm.resetFields();
      await refresh();
    } catch {
      /* validation error */
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    await deleteTable({ variables: { id: tableId } });
    message.success('Table deleted');
    await refresh();
  };

  const handleShiftSubmit = async () => {
    try {
      const values = await shiftForm.validateFields();
      if (editingShift) {
        await updateShift({ variables: { id: editingShift.id, input: values } });
        message.success('Shift updated');
      } else {
        await createShift({ variables: { restaurantId: restaurant!.id, input: values } });
        message.success('Shift created');
      }
      setShiftModalOpen(false);
      setEditingShift(null);
      shiftForm.resetFields();
      await refresh();
    } catch {
      /* validation error */
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift({ variables: { id: shiftId } });
    message.success('Shift deleted');
    await refresh();
  };

  if (!ready) return null;

  if (!loading && !restaurant) {
    return (
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Restaurant"
          extra={
            <Link href="/admin/restaurants">
              <Button icon={<ArrowLeftOutlined />}>Back to restaurants</Button>
            </Link>
          }
        />
        <Empty description="Restaurant not found" />
      </Space>
    );
  }

  return (
    <div component="AdminRestaurantDetailPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          title={restaurant?.name ?? 'Restaurant'}
          subtitle="Super-admin hub — profile, package, team, menu, reservations, and invoices."
          extra={
            <Space wrap>
              <Link href="/admin/restaurants">
                <Button icon={<ArrowLeftOutlined />}>Back</Button>
              </Link>
              {restaurant ? <StatusTag status={restaurant.status} /> : null}
              {dinerUrl ? (
                <Button
                  icon={<ExportOutlined />}
                  href={dinerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Public page
                </Button>
              ) : null}
              <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
                Refresh
              </Button>
            </Space>
          }
        />

        {loading && !restaurant ? (
          <Card>
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
              <Spin size="large" />
            </div>
          </Card>
        ) : restaurant ? (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Package</Text>
                          <Title level={4} style={{ margin: '4px 0 0' }}>
                            {restaurant.subscription?.plan
                              ? String(restaurant.subscription.plan).toUpperCase()
                              : 'None'}
                          </Title>
                          <Text type="secondary">
                            {restaurant.subscription?.status
                              ? statusCap(restaurant.subscription.status)
                              : 'No active subscription'}
                            {restaurant.subscription?.monthlyPriceCents != null
                              ? ` · ${money(restaurant.subscription.monthlyPriceCents)}/mo`
                              : ''}
                          </Text>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Menu</Text>
                          <Title level={4} style={{ margin: '4px 0 0' }}>
                            {menuItemCount} items
                          </Title>
                          <Text type="secondary">
                            {(restaurant.menu?.sections ?? []).length} section
                            {(restaurant.menu?.sections ?? []).length === 1 ? '' : 's'}
                          </Text>
                        </Card>
                      </Col>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Contact</Text>
                          <Title level={5} style={{ margin: '4px 0 0' }}>
                            {restaurant.phone || 'No phone'}
                          </Title>
                          <Text type="secondary">{restaurant.cuisine}</Text>
                        </Card>
                      </Col>
                    </Row>

                    <Card title="Restaurant details">
                      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="Name">{restaurant.name}</Descriptions.Item>
                        <Descriptions.Item label="Slug">{restaurant.slug || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <StatusTag status={restaurant.status} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Cuisine">{restaurant.cuisine}</Descriptions.Item>
                        <Descriptions.Item label="Price range">
                          {'$'.repeat(restaurant.priceRange || 1)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Featured">
                          {restaurant.featured ? 'Yes' : 'No'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phone">{restaurant.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Website">
                          {restaurant.website ? (
                            <Typography.Link href={restaurant.website} target="_blank">
                              {restaurant.website}
                            </Typography.Link>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Menu URL">
                          {restaurant.menuUrl ? (
                            <Typography.Link href={restaurant.menuUrl} target="_blank">
                              {restaurant.menuUrl}
                            </Typography.Link>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Address" span={3}>
                          {addressLine || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Description" span={3}>
                          {restaurant.description || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Deposit">
                          {restaurant.depositRequired
                            ? money(restaurant.depositAmountCents)
                            : 'Not required'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Loyalty">
                          {restaurant.loyaltyEnabled
                            ? `${restaurant.loyaltyPointsPerVisit ?? 0} pts / visit`
                            : 'Off'}
                        </Descriptions.Item>
                        <Descriptions.Item label="POS">
                          {restaurant.posEnabled ? 'Enabled' : 'Disabled'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Space wrap>
                      <Button type="primary" onClick={() => setTab('manage')}>
                        Edit details & package
                      </Button>
                      <Button onClick={() => setTab('menu')}>Manage menu</Button>
                      <Button onClick={() => setTab('reservations')}>Reservations</Button>
                      <Button icon={<FileTextOutlined />} onClick={() => setTab('invoices')}>
                        Invoices
                      </Button>
                      <Button onClick={() => setTab('preview')}>Diner preview</Button>
                    </Space>
                  </Space>
                ),
              },
              {
                key: 'manage',
                label: 'Manage',
                children: (
                  <Card>
                    <AdminManageRestaurant
                      presentation="panel"
                      restaurant={restaurant}
                      open
                      onClose={() => undefined}
                      onSaved={(updated) => {
                        setRestaurantOverride({ ...restaurant, ...updated });
                        void refresh();
                      }}
                    />
                  </Card>
                ),
              },
              {
                key: 'menu',
                label: 'Menu',
                children: (
                  <AdminRestaurantMenuPanel
                    restaurant={restaurant}
                    onSaved={() => void refresh()}
                  />
                ),
              },
              {
                key: 'reservations',
                label: 'Reservations',
                children: <AdminRestaurantReservationsPanel restaurantId={restaurant.id} />,
              },
              {
                key: 'invoices',
                label: 'Invoices',
                children: <AdminRestaurantInvoicesPanel restaurantId={restaurant.id} />,
              },
              {
                key: 'team',
                label: 'Owner & Team',
                children: (
                  <Space direction="vertical" size={spacing.md} style={{ width: '100%' }}>
                    {owner && (
                      <Card title="Owner">
                        <Descriptions bordered size="small" column={{ xs: 1, sm: 3 }}>
                          <Descriptions.Item label="Name">
                            <Link href={accountDetailPath(owner.role, owner.id)}>
                              {owner.firstName} {owner.lastName}
                            </Link>
                          </Descriptions.Item>
                          <Descriptions.Item label="Email">{owner.email}</Descriptions.Item>
                          <Descriptions.Item label="Phone">{owner.phone || '—'}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    )}
                    <Card title="Team Members">
                      <Table
                        dataSource={teamMembers}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          {
                            title: 'Name',
                            key: 'name',
                            render: (_: any, r: any) => (
                              <Link href={accountDetailPath(r.role, r.id)}>
                                {r.firstName} {r.lastName}
                              </Link>
                            ),
                          },
                          { title: 'Email', dataIndex: 'email' },
                          { title: 'Phone', dataIndex: 'phone' },
                          {
                            title: 'Role',
                            dataIndex: 'role',
                            render: (role: string) => {
                              const colorMap: Record<string, string> = {
                                diner: 'default',
                                restaurant_owner: 'blue',
                                staff: 'cyan',
                                admin: 'orange',
                                super_admin: 'red',
                              };
                              return <Tag color={colorMap[role] || 'default'}>{role}</Tag>;
                            },
                          },
                        ]}
                      />
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'tables',
                label: 'Tables',
                children: (
                  <Card
                    title="Tables"
                    extra={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingTable(null);
                          tableForm.resetFields();
                          tableForm.setFieldsValue({ active: true, combinable: false });
                          setTableModalOpen(true);
                        }}
                      >
                        Add Table
                      </Button>
                    }
                  >
                    <Table
                      dataSource={restaurant.tables ?? []}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Min Capacity', dataIndex: 'minCapacity' },
                        { title: 'Max Capacity', dataIndex: 'maxCapacity' },
                        { title: 'Floor Area', dataIndex: 'floorArea' },
                        {
                          title: 'Active',
                          dataIndex: 'active',
                          render: (v: boolean) => (
                            <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>
                          ),
                        },
                        {
                          title: 'Combinable',
                          dataIndex: 'combinable',
                          render: (v: boolean) => (v ? 'Yes' : 'No'),
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_: any, record: any) => (
                            <Space>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingTable(record);
                                  tableForm.setFieldsValue(record);
                                  setTableModalOpen(true);
                                }}
                              />
                              <Popconfirm
                                title="Delete this table?"
                                onConfirm={() => void handleDeleteTable(record.id)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                    <Modal
                      title={editingTable ? 'Edit Table' : 'Add Table'}
                      open={tableModalOpen}
                      onOk={() => void handleTableSubmit()}
                      onCancel={() => {
                        setTableModalOpen(false);
                        setEditingTable(null);
                      }}
                    >
                      <Form form={tableForm} layout="vertical">
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item name="minCapacity" label="Min Capacity" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="maxCapacity" label="Max Capacity" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="floorArea" label="Floor Area">
                          <Select
                            options={[
                              { label: 'Main', value: 'main' },
                              { label: 'Patio', value: 'patio' },
                              { label: 'Private', value: 'private' },
                              { label: 'Bar', value: 'bar' },
                              { label: 'Rooftop', value: 'rooftop' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="combinable" label="Combinable" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                        <Form.Item name="active" label="Active" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Form>
                    </Modal>
                  </Card>
                ),
              },
              {
                key: 'shifts',
                label: 'Shifts',
                children: (
                  <Card
                    title="Shifts"
                    extra={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingShift(null);
                          shiftForm.resetFields();
                          shiftForm.setFieldsValue({
                            active: true,
                            slotIntervalMinutes: 30,
                            turnTimeMinutes: 90,
                          });
                          setShiftModalOpen(true);
                        }}
                      >
                        Add Shift
                      </Button>
                    }
                  >
                    <Table
                      dataSource={restaurant.shifts ?? []}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        { title: 'Name', dataIndex: 'name' },
                        {
                          title: 'Days',
                          dataIndex: 'daysOfWeek',
                          render: (days: number[]) =>
                            (days ?? []).map((d) => (
                              <Tag key={d}>{DAY_NAMES[d]}</Tag>
                            )),
                        },
                        { title: 'Start Time', dataIndex: 'startTime' },
                        { title: 'End Time', dataIndex: 'endTime' },
                        { title: 'Slot Interval (min)', dataIndex: 'slotIntervalMinutes' },
                        { title: 'Turn Time (min)', dataIndex: 'turnTimeMinutes' },
                        {
                          title: 'Active',
                          dataIndex: 'active',
                          render: (v: boolean) => (
                            <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>
                          ),
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_: any, record: any) => (
                            <Space>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingShift(record);
                                  shiftForm.setFieldsValue(record);
                                  setShiftModalOpen(true);
                                }}
                              />
                              <Popconfirm
                                title="Delete this shift?"
                                onConfirm={() => void handleDeleteShift(record.id)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                    <Modal
                      title={editingShift ? 'Edit Shift' : 'Add Shift'}
                      open={shiftModalOpen}
                      onOk={() => void handleShiftSubmit()}
                      onCancel={() => {
                        setShiftModalOpen(false);
                        setEditingShift(null);
                      }}
                    >
                      <Form form={shiftForm} layout="vertical">
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item name="daysOfWeek" label="Days of Week" rules={[{ required: true }]}>
                          <Select
                            mode="multiple"
                            options={DAY_NAMES.map((name, i) => ({ label: name, value: i }))}
                          />
                        </Form.Item>
                        <Form.Item name="startTime" label="Start Time">
                          <Input placeholder="09:00" />
                        </Form.Item>
                        <Form.Item name="endTime" label="End Time">
                          <Input placeholder="22:00" />
                        </Form.Item>
                        <Form.Item name="slotIntervalMinutes" label="Slot Interval (min)">
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="turnTimeMinutes" label="Turn Time (min)">
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="active" label="Active" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Form>
                    </Modal>
                  </Card>
                ),
              },
              {
                key: 'preview',
                label: 'Diner preview',
                children: (
                  <Card
                    styles={{
                      body: {
                        padding: 0,
                        overflow: 'hidden',
                        minHeight: 'calc(100vh - 280px)',
                      },
                    }}
                  >
                    {dinerUrl ? (
                      <iframe
                        key={previewKey}
                        title={`${restaurant.name} diner preview`}
                        src={dinerUrl}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'calc(100vh - 280px)',
                          minHeight: 560,
                          border: 0,
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <div style={{ padding: spacing.lg }}>
                        <Text type="secondary">Unable to build diner preview URL.</Text>
                      </div>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        ) : null}
      </Space>
    </div>
  );
}

function statusCap(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
}
