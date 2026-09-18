'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
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
  TimePicker,
  Tooltip,
  Typography,
} from 'antd';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import PhotoUpload from '@/components/PhotoUpload';
import { EmptyState, PageHeader, colors, radii, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { useUrlTab } from '@/lib/useUrlTab';
import {
  MY_RESTAURANTS,
  CREATE_TABLE,
  DELETE_TABLE,
  CREATE_SHIFT,
  DELETE_SHIFT,
  UPDATE_TABLE,
  UPDATE_SHIFT,
} from '@/lib/graphql';

const { Text } = Typography;

const FLOOR_TABS = ['tables', 'shifts'] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_OPTIONS = DAYS.map((label, value) => ({ label, value }));
const FLOOR_AREA_PRESETS = ['Main', 'Patio', 'Private', 'Bar', 'Rooftop', 'Window'];
const SLOT_INTERVAL_OPTIONS = [15, 30, 45, 60].map((value) => ({
  value,
  label: `${value} min`,
}));

type FloorTable = {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  floorArea?: string;
  combinable?: boolean;
  active?: boolean;
  photoUrl?: string | null;
};

type FloorShift = {
  id: string;
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  turnTimeMinutes: number;
  active?: boolean;
};

function parseClock(value?: string | null) {
  if (!value) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}

function formatClock(value?: Dayjs | null) {
  return value ? value.format('HH:mm') : undefined;
}

function displayClock(value?: string | null) {
  const parsed = parseClock(value);
  return parsed ? parsed.format('h:mm A') : value || '—';
}

function mutationError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function normalizeAreaName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function findAreaName(name: string, areas: string[]) {
  const lower = name.toLowerCase();
  return areas.find((area) => area.toLowerCase() === lower);
}

type FloorAreaSelectProps = {
  value?: string;
  onChange?: (value?: string) => void;
  areas: string[];
  onAddArea?: (value: string) => void;
};

function FloorAreaSelect({ value, onChange, areas, onAddArea }: FloorAreaSelectProps) {
  const [draft, setDraft] = useState('');

  const options = useMemo(() => {
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const area of areas) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      items.push({ value: area, label: area });
    }
    if (value && !seen.has(value.toLowerCase())) {
      items.unshift({ value, label: value });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, value]);

  const addArea = () => {
    const next = normalizeAreaName(draft);
    if (!next) return;
    const existing = findAreaName(next, options.map((item) => item.value));
    const selected = existing ?? next;
    if (!existing) onAddArea?.(selected);
    onChange?.(selected);
    setDraft('');
  };

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={(next) => onChange?.(next)}
      options={options}
      placeholder="Select or add an area"
      optionFilterProp="label"
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space
            style={{ padding: '0 8px 8px', width: '100%' }}
            orientation="vertical"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Input
              placeholder="New area name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArea();
                }
              }}
              maxLength={40}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={addArea}
              disabled={!normalizeAreaName(draft)}
              block
            >
              Add “{normalizeAreaName(draft) || '…'}”
            </Button>
          </Space>
        </>
      )}
    />
  );
}

function FloorPageContent() {
  const { message } = App.useApp();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading: restaurantsLoading, refetch } = useQuery(MY_RESTAURANTS, {
    skip: !user,
  });
  const restaurants = data?.myRestaurants ?? [];
  const { activeRestaurantId } = usePartnerRestaurant(restaurants);
  const [tab, setTab] = useUrlTab({
    defaultValue: 'tables',
    allowed: FLOOR_TABS,
  });

  const [createTable, { loading: creatingTable }] = useMutation(CREATE_TABLE);
  const [deleteTable] = useMutation(DELETE_TABLE);
  const [createShift, { loading: creatingShift }] = useMutation(CREATE_SHIFT);
  const [deleteShift] = useMutation(DELETE_SHIFT);
  const [updateTable, { loading: updatingTable }] = useMutation(UPDATE_TABLE);
  const [updateShift, { loading: updatingShift }] = useMutation(UPDATE_SHIFT);

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<FloorTable | null>(null);
  const [editingShift, setEditingShift] = useState<FloorShift | null>(null);
  const [tableForm] = Form.useForm();
  const [shiftForm] = Form.useForm();
  const [customFloorAreas, setCustomFloorAreas] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setCustomFloorAreas([]);
  }, [activeRestaurantId]);

  const restaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const tables: FloorTable[] = restaurant?.tables ?? [];
  const shifts: FloorShift[] = restaurant?.shifts ?? [];

  const floorAreas = useMemo(() => {
    const fromTables = tables.map((t) => t.floorArea).filter((area): area is string => Boolean(area));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const area of [...FLOOR_AREA_PRESETS, ...fromTables, ...customFloorAreas]) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      names.push(area);
    }
    return names;
  }, [customFloorAreas, tables]);

  const openAddTable = () => {
    setEditingTable(null);
    tableForm.resetFields();
    tableForm.setFieldsValue({
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Main',
      combinable: false,
      active: true,
      photoUrl: [],
    });
    setTableModalOpen(true);
  };

  const openEditTable = (table: FloorTable) => {
    setEditingTable(table);
    tableForm.setFieldsValue({
      name: table.name,
      minCapacity: table.minCapacity,
      maxCapacity: table.maxCapacity,
      floorArea: table.floorArea ?? 'Main',
      combinable: table.combinable ?? false,
      active: table.active ?? true,
      photoUrl: table.photoUrl ? [table.photoUrl] : [],
    });
    setTableModalOpen(true);
  };

  const closeTableModal = () => {
    setTableModalOpen(false);
    setEditingTable(null);
  };

  const openAddShift = () => {
    setEditingShift(null);
    shiftForm.resetFields();
    shiftForm.setFieldsValue({
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: parseClock('17:00'),
      endTime: parseClock('22:00'),
      slotIntervalMinutes: 15,
      turnTimeMinutes: 90,
      active: true,
    });
    setShiftModalOpen(true);
  };

  const openEditShift = (shift: FloorShift) => {
    setEditingShift(shift);
    shiftForm.setFieldsValue({
      name: shift.name,
      daysOfWeek: shift.daysOfWeek,
      startTime: parseClock(shift.startTime),
      endTime: parseClock(shift.endTime),
      slotIntervalMinutes: shift.slotIntervalMinutes ?? 15,
      turnTimeMinutes: shift.turnTimeMinutes ?? 90,
      active: shift.active ?? true,
    });
    setShiftModalOpen(true);
  };

  const closeShiftModal = () => {
    setShiftModalOpen(false);
    setEditingShift(null);
  };

  const handleTableSubmit = async (values: {
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string;
    combinable?: boolean;
    active?: boolean;
    photoUrl?: string[];
  }) => {
    if (!activeRestaurantId) return;
    const input = {
      name: values.name.trim(),
      minCapacity: values.minCapacity,
      maxCapacity: values.maxCapacity,
      floorArea: values.floorArea?.trim() || 'Main',
      combinable: values.combinable ?? false,
      active: values.active ?? true,
      photoUrl: values.photoUrl?.[0] ?? null,
    };

    try {
      if (editingTable) {
        await updateTable({ variables: { id: editingTable.id, input } });
        message.success('Table updated');
      } else {
        await createTable({ variables: { restaurantId: activeRestaurantId, input } });
        message.success('Table added');
      }
      closeTableModal();
      tableForm.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, editingTable ? 'Failed to update table' : 'Failed to add table'));
    }
  };

  const handleShiftSubmit = async (values: {
    name: string;
    daysOfWeek: number[];
    startTime: Dayjs;
    endTime: Dayjs;
    slotIntervalMinutes?: number;
    turnTimeMinutes?: number;
    active?: boolean;
  }) => {
    if (!activeRestaurantId) return;
    const startTime = formatClock(values.startTime);
    const endTime = formatClock(values.endTime);
    if (!startTime || !endTime) {
      message.error('Enter a start and end time');
      return;
    }

    const input = {
      name: values.name.trim(),
      daysOfWeek: values.daysOfWeek,
      startTime,
      endTime,
      slotIntervalMinutes: values.slotIntervalMinutes ?? 15,
      turnTimeMinutes: values.turnTimeMinutes ?? 90,
      active: values.active ?? true,
    };

    try {
      if (editingShift) {
        await updateShift({ variables: { id: editingShift.id, input } });
        message.success('Shift updated');
      } else {
        await createShift({ variables: { restaurantId: activeRestaurantId, input } });
        message.success('Shift added');
      }
      closeShiftModal();
      shiftForm.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, editingShift ? 'Failed to update shift' : 'Failed to add shift'));
    }
  };

  const handleDeleteTable = async (id: string) => {
    try {
      await deleteTable({ variables: { id } });
      message.success('Table deleted');
      refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, 'Failed to delete table'));
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShift({ variables: { id } });
      message.success('Shift deleted');
      refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, 'Failed to delete shift'));
    }
  };

  const addDisabled = !activeRestaurantId;

  return (
    <div component="FloorPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Tables & shifts"
          subtitle="Seating and service windows used for availability, the floor plan, and diner booking"
        />

        <Card styles={{ body: { paddingTop: 8 } }} style={{ borderRadius: radii.lg }}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            tabBarExtraContent={
              tab === 'tables' ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddTable}
                  disabled={addDisabled}
                >
                  Add table
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddShift}
                  disabled={addDisabled}
                >
                  Add shift
                </Button>
              )
            }
            items={[
              {
                key: 'tables',
                label: `Tables${tables.length ? ` (${tables.length})` : ''}`,
                children: restaurantsLoading ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
                    <Spin />
                  </div>
                ) : tables.length === 0 ? (
                    <EmptyState
                      icon={<TableOutlined />}
                      title="No tables yet"
                      description="Add tables so diners can request a seat and the floor plan has something to arrange."
                      action={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={openAddTable}
                          disabled={addDisabled}
                        >
                          Add table
                        </Button>
                      }
                    />
                  ) : (
                    <Table
                      size="middle"
                      rowKey="id"
                      pagination={false}
                      dataSource={tables}
                      columns={[
                        {
                          title: 'Table',
                          dataIndex: 'name',
                          render: (_: unknown, t: FloorTable) => (
                            <Space>
                              <Avatar
                                shape="square"
                                size={40}
                                src={t.photoUrl || undefined}
                                icon={<TableOutlined />}
                                style={{
                                  borderRadius: radii.sm,
                                  background: colors.brand[50],
                                  color: colors.brand[600],
                                }}
                              />
                              <div>
                                <Text strong>{t.name}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t.minCapacity}–{t.maxCapacity} guests
                                  </Text>
                                </div>
                              </div>
                            </Space>
                          ),
                        },
                        {
                          title: 'Area',
                          dataIndex: 'floorArea',
                          render: (area: string | undefined) =>
                            area ? <Tag>{area}</Tag> : <Text type="secondary">—</Text>,
                        },
                        {
                          title: 'Combinable',
                          dataIndex: 'combinable',
                          render: (value: boolean | undefined) =>
                            value ? <Tag color="blue">Yes</Tag> : <Text type="secondary">No</Text>,
                        },
                        {
                          title: 'Status',
                          dataIndex: 'active',
                          render: (value: boolean | undefined) =>
                            value === false ? <Tag>Inactive</Tag> : <Tag color="green">Active</Tag>,
                        },
                        {
                          title: '',
                          key: 'actions',
                          align: 'right',
                          width: 96,
                          render: (_: unknown, t: FloorTable) => (
                            <Space>
                              <Tooltip title="Edit">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={() => openEditTable(t)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title="Delete this table?"
                                description="It will be removed from the floor plan and booking options."
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => void handleDeleteTable(t.id)}
                              >
                                <Tooltip title="Delete">
                                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
              },
              {
                key: 'shifts',
                label: `Shifts${shifts.length ? ` (${shifts.length})` : ''}`,
                children: restaurantsLoading ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
                    <Spin />
                  </div>
                ) : shifts.length === 0 ? (
                    <EmptyState
                      icon={<ClockCircleOutlined />}
                      title="No shifts yet"
                      description="Add lunch, dinner, or other service windows so diners can book available times."
                      action={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={openAddShift}
                          disabled={addDisabled}
                        >
                          Add shift
                        </Button>
                      }
                    />
                  ) : (
                    <Table
                      size="middle"
                      rowKey="id"
                      pagination={false}
                      dataSource={shifts}
                      columns={[
                        {
                          title: 'Shift',
                          dataIndex: 'name',
                          render: (name: string) => <Text strong>{name}</Text>,
                        },
                        {
                          title: 'Days',
                          dataIndex: 'daysOfWeek',
                          render: (days: number[]) => (
                            <Space size={[4, 4]} wrap>
                              {(days ?? []).map((d) => (
                                <Tag key={d} style={{ marginInlineEnd: 0 }}>
                                  {DAYS[d]}
                                </Tag>
                              ))}
                            </Space>
                          ),
                        },
                        {
                          title: 'Hours',
                          render: (_: unknown, s: FloorShift) => (
                            <Text>
                              {displayClock(s.startTime)}–{displayClock(s.endTime)}
                            </Text>
                          ),
                        },
                        {
                          title: 'Slot',
                          dataIndex: 'slotIntervalMinutes',
                          render: (value: number) => `${value} min`,
                        },
                        {
                          title: 'Turn',
                          dataIndex: 'turnTimeMinutes',
                          render: (value: number) => `${value} min`,
                        },
                        {
                          title: 'Status',
                          dataIndex: 'active',
                          render: (value: boolean | undefined) =>
                            value === false ? <Tag>Inactive</Tag> : <Tag color="green">Active</Tag>,
                        },
                        {
                          title: '',
                          key: 'actions',
                          align: 'right',
                          width: 96,
                          render: (_: unknown, s: FloorShift) => (
                            <Space>
                              <Tooltip title="Edit">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={() => openEditShift(s)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title="Delete this shift?"
                                description="Guests will no longer see these booking times."
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => void handleDeleteShift(s.id)}
                              >
                                <Tooltip title="Delete">
                                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
              },
            ]}
          />
        </Card>
      </Space>

      <Modal
        title={editingTable ? 'Edit table' : 'Add table'}
        open={tableModalOpen}
        onCancel={closeTableModal}
        onOk={() => tableForm.submit()}
        confirmLoading={creatingTable || updatingTable}
        okText={editingTable ? 'Save table' : 'Add table'}
        centered
        width={520}
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto' } }}
      >
        <Form
          form={tableForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void handleTableSubmit(values)}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="name"
            label="Table name"
            rules={[{ required: true, message: 'Enter a table name' }]}
          >
            <Input placeholder="e.g. T1, Window 4, Banquette" maxLength={40} />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="minCapacity"
                label="Min guests"
                rules={[{ required: true, message: 'Enter min guests' }]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxCapacity"
                label="Max guests"
                dependencies={['minCapacity']}
                rules={[
                  { required: true, message: 'Enter max guests' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const min = getFieldValue('minCapacity');
                      if (value != null && min != null && value < min) {
                        return Promise.reject(new Error('Max must be at least min'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="floorArea"
            label="Floor area"
            extra="Used to group tables on the floor plan and in diner booking."
          >
            <FloorAreaSelect
              areas={floorAreas}
              onAddArea={(area) => {
                setCustomFloorAreas((prev) =>
                  findAreaName(area, prev) ? prev : [...prev, area],
                );
              }}
            />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="combinable"
                label="Combinable"
                valuePropName="checked"
                extra="Join with nearby tables for larger parties"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="photoUrl" label="Photo" extra="Optional. Shown on the diner restaurant page.">
            <PhotoUpload maxCount={1} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingShift ? 'Edit shift' : 'Add shift'}
        open={shiftModalOpen}
        onCancel={closeShiftModal}
        onOk={() => shiftForm.submit()}
        confirmLoading={creatingShift || updatingShift}
        okText={editingShift ? 'Save shift' : 'Add shift'}
        centered
        width={520}
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto' } }}
      >
        <Form
          form={shiftForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void handleShiftSubmit(values)}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="name"
            label="Shift name"
            rules={[{ required: true, message: 'Enter a shift name' }]}
          >
            <Input placeholder="e.g. Lunch, Dinner, Brunch" maxLength={40} />
          </Form.Item>
          <Form.Item
            name="daysOfWeek"
            label="Days"
            rules={[{ required: true, message: 'Select at least one day' }]}
          >
            <Checkbox.Group options={DAY_OPTIONS} />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Start"
                rules={[{ required: true, message: 'Choose a start time' }]}
              >
                <TimePicker
                  format="h:mm A"
                  use12Hours
                  minuteStep={15}
                  style={{ width: '100%' }}
                  needConfirm={false}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="End"
                rules={[{ required: true, message: 'Choose an end time' }]}
              >
                <TimePicker
                  format="h:mm A"
                  use12Hours
                  minuteStep={15}
                  style={{ width: '100%' }}
                  needConfirm={false}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="slotIntervalMinutes"
                label="Slot interval"
                extra="How often new reservation times open"
              >
                <Select options={SLOT_INTERVAL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="turnTimeMinutes"
                label="Turn time"
                extra="Minutes a party typically occupies a table"
              >
                <InputNumber min={30} max={240} step={15} addonAfter="min" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function FloorPage() {
  return (
    <div component="FloorPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <FloorPageContent />
      </Suspense>
    </div>
  );
}
