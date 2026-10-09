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
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { EmptyState, PageHeader, colors, radii, spacing } from '@reservations/ui';
import { FloorAreaManageModal } from '@/components/FloorAreaManageModal';
import {
  findAreaName,
  TableFormFields,
  tableDepositFormValues,
  tableDepositInput,
  type TableDepositFormValues,
} from '@/components/TableFormFields';
import { useAuth } from '@/lib/auth';
import { usePartnerRestaurant } from '@/lib/usePartnerRestaurant';
import { useUrlTab } from '@/lib/useUrlTab';
import { useFormDirty } from '@/lib/useFormDirty';
import {
  MY_RESTAURANTS,
  CREATE_TABLE,
  DELETE_TABLE,
  CREATE_SHIFT,
  DELETE_SHIFT,
  UPDATE_TABLE,
  UPDATE_SHIFT,
  ENSURE_FLOOR_AREA,
  RENAME_FLOOR_AREA,
  DELETE_FLOOR_AREA,
} from '@/lib/graphql';

const { Text } = Typography;

const FLOOR_TABS = ['tables', 'areas', 'shifts'] as const;
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
  shape?: string;
  photoUrl?: string | null;
  requiresManualApproval?: boolean;
  depositRequired?: boolean;
  depositAmountCents?: number;
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
  const [ensureFloorArea, { loading: ensuringArea }] = useMutation(ENSURE_FLOOR_AREA);
  const [renameFloorArea, { loading: renamingArea }] = useMutation(RENAME_FLOOR_AREA);
  const [deleteFloorAreaMut] = useMutation(DELETE_FLOOR_AREA);

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [areaModal, setAreaModal] = useState<'add' | 'edit' | null>(null);
  const [editingTable, setEditingTable] = useState<FloorTable | null>(null);
  const [editingShift, setEditingShift] = useState<FloorShift | null>(null);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [tableForm] = Form.useForm();
  const [shiftForm] = Form.useForm();
  const tableDirty = useFormDirty();
  const shiftDirty = useFormDirty();
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
  const appearanceAreas: string[] = useMemo(() => {
    const published =
      (restaurant?.floorPlanAreaAppearances as Array<{ floorArea?: string }> | undefined) ?? [];
    const draft =
      (restaurant?.floorPlanDraft?.areaAppearances as Array<{ floorArea?: string }> | undefined) ??
      [];
    return [...published, ...draft]
      .map((a) => a.floorArea)
      .filter((area): area is string => Boolean(area));
  }, [restaurant]);

  const floorAreas = useMemo(() => {
    const fromTables = tables.map((t) => t.floorArea).filter((area): area is string => Boolean(area));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const area of [
      ...FLOOR_AREA_PRESETS,
      ...fromTables,
      ...appearanceAreas,
      ...customFloorAreas,
    ]) {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      names.push(area);
    }
    return names;
  }, [appearanceAreas, customFloorAreas, tables]);

  /** Areas that exist on tables or saved appearances (excludes unused presets). */
  const managedAreas = useMemo(() => {
    const fromTables = tables.map((t) => t.floorArea).filter((area): area is string => Boolean(area));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const area of [...fromTables, ...appearanceAreas, ...customFloorAreas, 'Main']) {
      const key = (area || '').toLowerCase();
      if (!area || seen.has(key)) continue;
      seen.add(key);
      names.push(area);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [appearanceAreas, customFloorAreas, tables]);

  const areaRows = useMemo(
    () =>
      managedAreas.map((name) => ({
        name,
        tableCount: tables.filter(
          (t) => (t.floorArea || 'Main').toLowerCase() === name.toLowerCase(),
        ).length,
      })),
    [managedAreas, tables],
  );

  const openAddTable = () => {
    setEditingTable(null);
    tableForm.resetFields();
    tableForm.setFieldsValue({
      minCapacity: 2,
      maxCapacity: 4,
      floorArea: 'Main',
      shape: 'rect',
      combinable: false,
      active: true,
      requiresManualApproval: false,
      depositRequired: false,
      depositAmount: null,
      photoUrl: [],
    });
    tableDirty.clearDirty();
    setTableModalOpen(true);
  };

  const openEditTable = (table: FloorTable) => {
    setEditingTable(table);
    tableForm.setFieldsValue({
      name: table.name,
      minCapacity: table.minCapacity,
      maxCapacity: table.maxCapacity,
      floorArea: table.floorArea ?? 'Main',
      shape: table.shape || 'rect',
      combinable: table.combinable ?? false,
      active: table.active ?? true,
      requiresManualApproval: table.requiresManualApproval ?? false,
      ...tableDepositFormValues(table),
      photoUrl: table.photoUrl ? [table.photoUrl] : [],
    });
    tableDirty.clearDirty();
    setTableModalOpen(true);
  };

  const closeTableModal = () => {
    setTableModalOpen(false);
    setEditingTable(null);
    tableDirty.clearDirty();
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
    shiftDirty.clearDirty();
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
    shiftDirty.clearDirty();
    setShiftModalOpen(true);
  };

  const closeShiftModal = () => {
    setShiftModalOpen(false);
    setEditingShift(null);
    shiftDirty.clearDirty();
  };

  const handleTableSubmit = async (values: {
    name: string;
    minCapacity: number;
    maxCapacity: number;
    floorArea?: string;
    shape?: string;
    combinable?: boolean;
    active?: boolean;
    requiresManualApproval?: boolean;
    photoUrl?: string[];
  } & TableDepositFormValues) => {
    if (!activeRestaurantId || !tableDirty.dirty) return;
    const input = {
      name: values.name.trim(),
      minCapacity: values.minCapacity,
      maxCapacity: values.maxCapacity,
      floorArea: values.floorArea?.trim() || 'Main',
      shape: values.shape || 'rect',
      combinable: values.combinable ?? false,
      active: values.active ?? true,
      requiresManualApproval: values.requiresManualApproval ?? false,
      ...tableDepositInput(values),
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
    if (!activeRestaurantId || !shiftDirty.dirty) return;
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

  const openAddArea = () => {
    setEditingArea(null);
    setAreaModal('add');
  };

  const openEditArea = (name: string) => {
    setEditingArea(name);
    setAreaModal('edit');
  };

  const handleAreaSubmit = async (name: string) => {
    if (!activeRestaurantId) return;
    try {
      if (areaModal === 'edit' && editingArea) {
        await renameFloorArea({
          variables: { restaurantId: activeRestaurantId, from: editingArea, to: name },
        });
        message.success(`Renamed to ${name}`);
      } else {
        await ensureFloorArea({
          variables: { restaurantId: activeRestaurantId, name },
        });
        setCustomFloorAreas((prev) => (findAreaName(name, prev) ? prev : [...prev, name]));
        message.success(`Added ${name}`);
      }
      setAreaModal(null);
      setEditingArea(null);
      await refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, 'Failed to update area'));
    }
  };

  const handleDeleteArea = async (name: string) => {
    if (!activeRestaurantId) return;
    try {
      await deleteFloorAreaMut({
        variables: { restaurantId: activeRestaurantId, name },
      });
      setCustomFloorAreas((prev) => prev.filter((a) => a.toLowerCase() !== name.toLowerCase()));
      message.success(`Removed ${name}`);
      await refetch();
    } catch (err: unknown) {
      message.error(mutationError(err, 'Failed to delete area'));
    }
  };

  const addDisabled = !activeRestaurantId;

  return (
    <div component="FloorPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Tables & shifts"
          subtitle="Floor areas, seating, and service windows for availability, the floor plan, and diner booking"
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
              ) : tab === 'areas' ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddArea}
                  disabled={addDisabled}
                >
                  Add area
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
                key: 'areas',
                label: `Areas${areaRows.length ? ` (${areaRows.length})` : ''}`,
                children: restaurantsLoading ? (
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
                    <Spin />
                  </div>
                ) : areaRows.length === 0 ? (
                  <EmptyState
                    icon={<TableOutlined />}
                    title="No floor areas yet"
                    description="Add areas like Main, Patio, or Private dining, then assign tables to them."
                    action={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openAddArea}
                        disabled={addDisabled}
                      >
                        Add area
                      </Button>
                    }
                  />
                ) : (
                  <Table
                    size="middle"
                    rowKey="name"
                    pagination={false}
                    dataSource={areaRows}
                    columns={[
                      {
                        title: 'Area',
                        dataIndex: 'name',
                        render: (name: string) => <Text strong>{name}</Text>,
                      },
                      {
                        title: 'Tables',
                        dataIndex: 'tableCount',
                        width: 120,
                        render: (count: number) =>
                          count ? (
                            <Tag color="blue">{count}</Tag>
                          ) : (
                            <Text type="secondary">None</Text>
                          ),
                      },
                      {
                        title: '',
                        key: 'actions',
                        align: 'right',
                        width: 96,
                        render: (_: unknown, row: { name: string; tableCount: number }) => (
                          <Space>
                            <Tooltip title="Rename">
                              <Button
                                size="small"
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => openEditArea(row.name)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title={`Delete “${row.name}”?`}
                              description={
                                row.tableCount > 0
                                  ? 'Move or delete tables in this area first.'
                                  : 'Removes this area from Area settings. Main cannot be deleted.'
                              }
                              okText="Delete"
                              okButtonProps={{
                                danger: true,
                                disabled: row.name.toLowerCase() === 'main' || row.tableCount > 0,
                              }}
                              disabled={row.name.toLowerCase() === 'main' || row.tableCount > 0}
                              onConfirm={() => void handleDeleteArea(row.name)}
                            >
                              <Tooltip
                                title={
                                  row.name.toLowerCase() === 'main'
                                    ? 'Main cannot be deleted'
                                    : row.tableCount > 0
                                      ? 'Move tables first'
                                      : 'Delete'
                                }
                              >
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  disabled={row.name.toLowerCase() === 'main' || row.tableCount > 0}
                                />
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
        title={
          <span className="rt-table-modal__title">
            {editingTable ? (
              <EditOutlined className="rt-table-modal__title-icon" aria-hidden />
            ) : (
              <TableOutlined className="rt-table-modal__title-icon" aria-hidden />
            )}
            <span>{editingTable ? 'Edit table' : 'Add table'}</span>
          </span>
        }
        open={tableModalOpen}
        onCancel={closeTableModal}
        confirmLoading={creatingTable || updatingTable}
        centered
        width={520}
        wrapClassName="rt-mobile-modal rt-table-modal"
        destroyOnHidden
        focusable={{ trap: false }}
        maskClosable={!tableDirty.dirty}
        footer={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            <Button onClick={closeTableModal}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={creatingTable || updatingTable}
              disabled={!tableDirty.dirty}
              onClick={() => tableForm.submit()}
            >
              {editingTable ? 'Save table' : 'Add table'}
            </Button>
          </div>
        }
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        <Form
          form={tableForm}
          layout="vertical"
          requiredMark={false}
          onValuesChange={tableDirty.onValuesChange}
          onFinish={(values) => void handleTableSubmit(values)}
          style={{ marginBottom: 0 }}
        >
          <TableFormFields
            floorAreas={floorAreas}
            onAddArea={(area) => {
              setCustomFloorAreas((prev) =>
                findAreaName(area, prev) ? prev : [...prev, area],
              );
            }}
          />
        </Form>
      </Modal>

      <FloorAreaManageModal
        open={areaModal != null}
        mode={areaModal === 'edit' ? 'edit' : 'add'}
        initialName={editingArea ?? undefined}
        existingAreas={managedAreas}
        confirmLoading={ensuringArea || renamingArea}
        onCancel={() => {
          setAreaModal(null);
          setEditingArea(null);
        }}
        onSubmit={handleAreaSubmit}
      />

      <Modal
        title={editingShift ? 'Edit shift' : 'Add shift'}
        open={shiftModalOpen}
        onCancel={closeShiftModal}
        onOk={() => shiftForm.submit()}
        confirmLoading={creatingShift || updatingShift}
        okText={editingShift ? 'Save shift' : 'Add shift'}
        okButtonProps={{ disabled: !shiftDirty.dirty }}
        centered
        width={520}
        styles={{ body: { maxHeight: 'min(70vh, 560px)', overflowY: 'auto' } }}
      >
        <Form
          form={shiftForm}
          layout="vertical"
          requiredMark={false}
          onValuesChange={shiftDirty.onValuesChange}
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
