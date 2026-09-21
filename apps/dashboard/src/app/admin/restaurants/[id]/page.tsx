'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
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
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { buildRestaurantBookingUrl } from '@reservations/shared';
import {
  PageHeader,
  StatusTag,
  EmptyState,
  colors,
  pickRestaurantLogo,
  priceRangeLabel,
  restaurantInitials,
  spacing,
} from '@reservations/ui';
import {
  AdminManageRestaurant,
  MANAGE_PANEL_GROUPS,
  type AdminRestaurantRecord,
} from '@/components/AdminManageRestaurant';
import { AdminRestaurantInvoicesPanel } from '@/components/AdminRestaurantInvoicesPanel';
import { AdminRestaurantMenuPanel } from '@/components/AdminRestaurantMenuPanel';
import { AdminRestaurantOverviewPanel } from '@/components/AdminRestaurantOverviewPanel';
import { AdminRestaurantPackagePanel } from '@/components/AdminRestaurantPackagePanel';
import { AdminRestaurantReservationsPanel } from '@/components/AdminRestaurantReservationsPanel';
import { AdminRestaurantReviewsPanel } from '@/components/AdminRestaurantReviewsPanel';
import { AdminRestaurantTeamPanel } from '@/components/AdminRestaurantTeamPanel';
import { AdminRestaurantWidgetPanel } from '@/components/AdminRestaurantWidgetPanel';
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
import { useUrlTab } from '@/lib/useUrlTab';
import { getPublicWebUrl } from '@/lib/webUrl';

const DETAIL_TABS = [
  'overview',
  'manage',
  'package',
  'menu',
  'reservations',
  'reviews',
  'widget',
  'invoices',
  'team',
  'tables',
  'shifts',
  'preview',
] as const;

const MANAGE_SECTIONS = [...MANAGE_PANEL_GROUPS, 'details', 'profile', 'team'] as const;
const TAB_RESET_PARAMS = ['page', 'pageSize'];

const { Text } = Typography;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function titleCase(value?: string | null) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

function AdminRestaurantDetailContent() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();
  const [tab, setTab] = useUrlTab({
    defaultValue: 'overview',
    allowed: DETAIL_TABS,
    resetParams: TAB_RESET_PARAMS,
  });
  const [section, setSection] = useUrlTab({
    param: 'section',
    defaultValue: 'listing',
    allowed: MANAGE_SECTIONS,
  });
  const goToTab = (key: string) => {
    setTab(key, key === 'manage' ? undefined : { section: undefined });
  };
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

  const identityLine = restaurant
    ? [
        restaurant.cuisine,
        priceRangeLabel(restaurant.priceRange || 1),
        [restaurant.address?.city, restaurant.address?.state].filter(Boolean).join(', ') || null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const logoSrc = restaurant
    ? pickRestaurantLogo(restaurant.logoUrl, restaurant.photos)
    : null;

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
          back={
            <Link href="/admin/restaurants">
              <Button type="text" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0, height: 'auto' }}>
                Restaurants
              </Button>
            </Link>
          }
        />
        <Empty description="Restaurant not found" />
      </Space>
    );
  }

  return (
    <div component="AdminRestaurantDetailContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
        <PageHeader
          back={
            <Link href="/admin/restaurants">
              <Button type="text" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0, height: 'auto' }}>
                Restaurants
              </Button>
            </Link>
          }
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {restaurant ? (
                <Avatar
                  src={logoSrc ?? undefined}
                  size={40}
                  style={{ background: colors.brand[600], flexShrink: 0 }}
                >
                  {restaurantInitials(restaurant.name)}
                </Avatar>
              ) : null}
              {restaurant?.name ?? 'Restaurant'}
              {restaurant ? <StatusTag status={restaurant.status} /> : null}
            </span>
          }
          subtitle={identityLine || 'Restaurant profile and operations'}
          extra={
            <Space wrap>
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
            activeKey={tab === 'shifts' ? 'tables' : tab}
            onChange={goToTab}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <AdminRestaurantOverviewPanel
                    restaurant={restaurant}
                    owner={owner}
                    teamCount={teamMembers.length}
                    onGoToTab={goToTab}
                  />
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
                      editTab={section}
                      onEditTabChange={setSection}
                      hiddenTabs={['package', 'team', 'profile']}
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
                key: 'package',
                label: 'Package',
                children: (
                  <AdminRestaurantPackagePanel
                    restaurant={restaurant}
                    onSaved={(updated) => {
                      setRestaurantOverride({ ...restaurant, ...updated });
                      void refresh();
                    }}
                  />
                ),
              },
              {
                key: 'menu',
                label: 'Menu',
                children: (
                  <Card>
                    <AdminRestaurantMenuPanel
                      restaurant={restaurant}
                      onSaved={() => void refresh()}
                    />
                  </Card>
                ),
              },
              {
                key: 'reservations',
                label: 'Reservations',
                children: <AdminRestaurantReservationsPanel restaurantId={restaurant.id} />,
              },
              {
                key: 'reviews',
                label: 'Reviews',
                children: (
                  <AdminRestaurantReviewsPanel
                    restaurantId={restaurant.id}
                    photos={restaurant.photos}
                    onPhotosSaved={() => void refresh()}
                  />
                ),
              },
              {
                key: 'widget',
                label: 'Booking widget',
                children: (
                  <AdminRestaurantWidgetPanel
                    restaurant={restaurant}
                    onSaved={(updated) => {
                      setRestaurantOverride({ ...restaurant, ...updated });
                    }}
                  />
                ),
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
                  <AdminRestaurantTeamPanel
                    restaurantId={restaurant.id}
                    ownerId={restaurant.ownerId}
                  />
                ),
              },
              {
                key: 'tables',
                label: 'Tables & shifts',
                children: (
                  <Tabs
                    activeKey={tab === 'shifts' ? 'shifts' : 'tables'}
                    onChange={goToTab}
                    items={[
                      {
                        key: 'tables',
                        label: `Tables (${(restaurant.tables ?? []).length})`,
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
                                Add table
                              </Button>
                            }
                          >
                            {(restaurant.tables ?? []).length === 0 ? (
                              <EmptyState
                                icon={<TableOutlined />}
                                title="No tables yet"
                                description="Add tables so the floor plan and booking assignment have seats to work with."
                                action={
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
                                    Add table
                                  </Button>
                                }
                              />
                            ) : (
                              <Table
                                dataSource={restaurant.tables ?? []}
                                rowKey="id"
                                pagination={false}
                                columns={[
                                  { title: 'Name', dataIndex: 'name' },
                                  {
                                    title: 'Seats',
                                    key: 'seats',
                                    render: (_: unknown, record: any) =>
                                      record.minCapacity === record.maxCapacity
                                        ? record.maxCapacity
                                        : `${record.minCapacity}–${record.maxCapacity}`,
                                  },
                                  {
                                    title: 'Area',
                                    dataIndex: 'floorArea',
                                    render: (area: string) => titleCase(area),
                                  },
                                  {
                                    title: 'Status',
                                    dataIndex: 'active',
                                    render: (active: boolean) => (
                                      <Tag color={active !== false ? 'green' : 'default'}>
                                        {active !== false ? 'Active' : 'Inactive'}
                                      </Tag>
                                    ),
                                  },
                                  {
                                    title: 'Combinable',
                                    dataIndex: 'combinable',
                                    render: (combinable: boolean) => (combinable ? 'Yes' : 'No'),
                                  },
                                  {
                                    title: '',
                                    key: 'actions',
                                    width: 160,
                                    render: (_: unknown, record: any) => (
                                      <Space>
                                        <Button
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => {
                                            setEditingTable(record);
                                            tableForm.setFieldsValue(record);
                                            setTableModalOpen(true);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Popconfirm
                                          title="Delete this table?"
                                          onConfirm={() => void handleDeleteTable(record.id)}
                                        >
                                          <Button size="small" danger icon={<DeleteOutlined />}>
                                            Delete
                                          </Button>
                                        </Popconfirm>
                                      </Space>
                                    ),
                                  },
                                ]}
                              />
                            )}
                            <Modal
                              title={editingTable ? 'Edit table' : 'Add table'}
                              open={tableModalOpen}
                              onOk={() => void handleTableSubmit()}
                              onCancel={() => {
                                setTableModalOpen(false);
                                setEditingTable(null);
                              }}
                            >
                              <Form form={tableForm} layout="vertical">
                                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                  <Input placeholder="e.g. T1" />
                                </Form.Item>
                                <Form.Item name="minCapacity" label="Min seats" rules={[{ required: true }]}>
                                  <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="maxCapacity" label="Max seats" rules={[{ required: true }]}>
                                  <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="floorArea" label="Area">
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
                        label: `Shifts (${(restaurant.shifts ?? []).length})`,
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
                                Add shift
                              </Button>
                            }
                          >
                            {(restaurant.shifts ?? []).length === 0 ? (
                              <EmptyState
                                icon={<ClockCircleOutlined />}
                                title="No shifts yet"
                                description="Add lunch, dinner, or other service windows so diners can book times."
                                action={
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
                                    Add shift
                                  </Button>
                                }
                              />
                            ) : (
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
                                      (days ?? []).map((day) => <Tag key={day}>{DAY_NAMES[day]}</Tag>),
                                  },
                                  {
                                    title: 'Hours',
                                    key: 'hours',
                                    render: (_: unknown, record: any) =>
                                      `${record.startTime} – ${record.endTime}`,
                                  },
                                  {
                                    title: 'Slots',
                                    key: 'slots',
                                    render: (_: unknown, record: any) =>
                                      `${record.slotIntervalMinutes} min · ${record.turnTimeMinutes} min turn`,
                                  },
                                  {
                                    title: 'Status',
                                    dataIndex: 'active',
                                    render: (active: boolean) => (
                                      <Tag color={active !== false ? 'green' : 'default'}>
                                        {active !== false ? 'Active' : 'Inactive'}
                                      </Tag>
                                    ),
                                  },
                                  {
                                    title: '',
                                    key: 'actions',
                                    width: 160,
                                    render: (_: unknown, record: any) => (
                                      <Space>
                                        <Button
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => {
                                            setEditingShift(record);
                                            shiftForm.setFieldsValue(record);
                                            setShiftModalOpen(true);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Popconfirm
                                          title="Delete this shift?"
                                          onConfirm={() => void handleDeleteShift(record.id)}
                                        >
                                          <Button size="small" danger icon={<DeleteOutlined />}>
                                            Delete
                                          </Button>
                                        </Popconfirm>
                                      </Space>
                                    ),
                                  },
                                ]}
                              />
                            )}
                            <Modal
                              title={editingShift ? 'Edit shift' : 'Add shift'}
                              open={shiftModalOpen}
                              onOk={() => void handleShiftSubmit()}
                              onCancel={() => {
                                setShiftModalOpen(false);
                                setEditingShift(null);
                              }}
                            >
                              <Form form={shiftForm} layout="vertical">
                                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                                  <Input placeholder="e.g. Dinner" />
                                </Form.Item>
                                <Form.Item
                                  name="daysOfWeek"
                                  label="Days"
                                  rules={[{ required: true, message: 'Select at least one day' }]}
                                >
                                  <Select
                                    mode="multiple"
                                    options={DAY_NAMES.map((name, index) => ({ label: name, value: index }))}
                                  />
                                </Form.Item>
                                <Form.Item name="startTime" label="Start" extra="24-hour time, e.g. 17:30">
                                  <Input placeholder="17:30" />
                                </Form.Item>
                                <Form.Item name="endTime" label="End" extra="24-hour time, e.g. 22:00">
                                  <Input placeholder="22:00" />
                                </Form.Item>
                                <Form.Item
                                  name="slotIntervalMinutes"
                                  label="Slot interval"
                                  extra="How often new reservation times open"
                                >
                                  <InputNumber min={1} addonAfter="min" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                  name="turnTimeMinutes"
                                  label="Turn time"
                                  extra="Minutes a party typically occupies a table"
                                >
                                  <InputNumber min={1} addonAfter="min" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="active" label="Active" valuePropName="checked">
                                  <Switch />
                                </Form.Item>
                              </Form>
                            </Modal>
                          </Card>
                        ),
                      },
                    ]}
                  />
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

export default function AdminRestaurantDetailPage() {
  return (
    <div component="AdminRestaurantDetailPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <AdminRestaurantDetailContent />
      </Suspense>
    </div>
  );
}
