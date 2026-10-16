'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  MAX_CLOSURE_RANGE_DAYS,
  addCalendarDays,
  eachCalendarDate,
  isPastCalendarDay,
  restaurantTimeZone,
} from '@reservations/shared';
import { PageHeader } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  CREATE_BLACKOUT,
  RESTAURANT_BLACKOUTS,
  DELETE_BLACKOUT,
  DATE_SCHEDULE_OVERRIDES,
  UPSERT_DATE_SCHEDULE_OVERRIDE,
  REVIEW_DATE_SCHEDULE_OVERRIDE,
  DELETE_DATE_SCHEDULE_OVERRIDE,
} from '@/lib/graphql';
import { buildRestaurantSelectOptions, validatedRestaurantId } from '@/lib/restaurants';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Text, Paragraph } = Typography;

type SpecialMode = 'closed' | 'custom_hours' | 'require_approval';

type ScheduleOverride = {
  id: string;
  date: string;
  mode: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  source?: string | null;
  holidayKey?: string | null;
  status: string;
};

type BlackoutItem = {
  id: string;
  date: string;
  reason?: string | null;
  allDay?: boolean;
};

type DateRangeValue = [dayjs.Dayjs, dayjs.Dayjs] | null;

const MODE_HELP: Record<SpecialMode, string> = {
  closed: 'Booking is blocked for every day in the range as soon as you save.',
  custom_hours: 'Replaces the usual shifts with these hours on each selected day.',
  require_approval:
    'Saves as pending. The venue stays open until a host, manager, or owner approves the closure.',
};

function isPlatformHoliday(item: ScheduleOverride) {
  return item.source === 'platform_holiday' || Boolean(item.holidayKey);
}

function rangeDayCount(value: DateRangeValue | undefined): number {
  if (!value?.[0] || !value?.[1]) return 0;
  return value[1].startOf('day').diff(value[0].startOf('day'), 'day') + 1;
}

function formatClosureRange(start: string, end: string): string {
  const a = dayjs(start);
  const b = dayjs(end);
  if (start === end) return a.format('MMM D, YYYY');
  if (a.isSame(b, 'year') && a.isSame(b, 'month')) {
    return `${a.format('MMM D')}–${b.format('D, YYYY')}`;
  }
  if (a.isSame(b, 'year')) return `${a.format('MMM D')} – ${b.format('MMM D, YYYY')}`;
  return `${a.format('MMM D, YYYY')} – ${b.format('MMM D, YYYY')}`;
}

function rangeSummary(start: string, end: string, count: number): string {
  const label = formatClosureRange(start, end);
  return count === 1 ? label : `${label} · ${count} days`;
}

function groupConsecutive<T extends { date: string }>(
  items: T[],
  sameGroup: (a: T, b: T) => boolean,
): T[][] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const groups: T[][] = [];
  for (const item of sorted) {
    const current = groups[groups.length - 1];
    const prev = current?.[current.length - 1];
    if (prev && sameGroup(prev, item) && addCalendarDays(prev.date, 1) === item.date) {
      current.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function DateRangeField({ timeZone }: { timeZone: string }) {
  const today = dayjs();
  return (
    <Form.Item noStyle shouldUpdate={(prev, next) => prev.dates !== next.dates}>
      {(form) => {
        const count = rangeDayCount(form.getFieldValue('dates'));
        return (
          <Form.Item
            name="dates"
            label="Dates"
            extra={
              count
                ? count === 1
                  ? 'This day only'
                  : `Applies to ${count} days`
                : 'One day, or a start and end date'
            }
            rules={[
              { required: true, message: 'Select a start and end date' },
              {
                validator: async (_, value: DateRangeValue) => {
                  if (!value?.[0] || !value?.[1]) {
                    throw new Error('Select a start and end date');
                  }
                  const days = rangeDayCount(value);
                  if (days > MAX_CLOSURE_RANGE_DAYS) {
                    throw new Error(`Choose ${MAX_CLOSURE_RANGE_DAYS} days or fewer`);
                  }
                },
              },
            ]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="MMM D, YYYY"
              placeholder={['Start', 'End']}
              disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
              presets={[
                { label: 'Today', value: [today, today] },
                { label: 'Tomorrow', value: [today.add(1, 'day'), today.add(1, 'day')] },
                { label: 'Next 7 days', value: [today, today.add(6, 'day')] },
                { label: 'Next 14 days', value: [today, today.add(13, 'day')] },
              ]}
            />
          </Form.Item>
        );
      }}
    </Form.Item>
  );
}

export default function BlackoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [hoursForm] = Form.useForm();
  const [editingIdsByDate, setEditingIdsByDate] = useState<Record<string, string> | null>(null);
  const { data } = useQuery(MY_RESTAURANTS, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const restaurantIds = restaurants.map((r: { id: string }) => r.id);
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const activeRestaurantId = validatedRestaurantId(restaurantId, restaurantIds);
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const timeZone = restaurantTimeZone(activeRestaurant ?? {});

  const { data: blackoutsData, refetch } = useQuery(RESTAURANT_BLACKOUTS, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId! },
  });
  const { data: overridesData, refetch: refetchOverrides } = useQuery(DATE_SCHEDULE_OVERRIDES, {
    skip: !activeRestaurantId,
    variables: { restaurantId: activeRestaurantId! },
  });
  const [createBlackout, { loading: creating }] = useMutation(CREATE_BLACKOUT);
  const [deleteBlackout] = useMutation(DELETE_BLACKOUT);
  const [upsertOverride, { loading: savingOverride }] = useMutation(UPSERT_DATE_SCHEDULE_OVERRIDE);
  const [reviewOverride, { loading: reviewingHoliday }] = useMutation(REVIEW_DATE_SCHEDULE_OVERRIDE);
  const [deleteOverride] = useMutation(DELETE_DATE_SCHEDULE_OVERRIDE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleFinish = async (values: { dates: [dayjs.Dayjs, dayjs.Dayjs]; reason?: string }) => {
    if (!activeRestaurantId) return;
    const start = values.dates[0].format('YYYY-MM-DD');
    const end = values.dates[1].format('YYYY-MM-DD');
    try {
      const dates = eachCalendarDate(start, end);
      await createBlackout({
        variables: {
          restaurantId: activeRestaurantId,
          date: start,
          endDate: end,
          reason: values.reason || null,
          allDay: true,
        },
      });
      message.success(`Blackout saved for ${rangeSummary(start, end, dates.length)}`);
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(errorMessage(err, 'Failed to create blackout'));
    }
  };

  const resetHoursForm = () => {
    setEditingIdsByDate(null);
    hoursForm.resetFields();
    hoursForm.setFieldsValue({ mode: 'closed' });
  };

  const handleHoursFinish = async (values: {
    dates: [dayjs.Dayjs, dayjs.Dayjs];
    mode: SpecialMode;
    reason?: string;
    startTime?: dayjs.Dayjs;
    endTime?: dayjs.Dayjs;
  }) => {
    if (!activeRestaurantId) return;
    const start = values.dates[0].format('YYYY-MM-DD');
    const end = values.dates[1].format('YYYY-MM-DD');
    const requireApproval = values.mode === 'require_approval';
    const scheduleMode = values.mode === 'custom_hours' ? 'custom_hours' : 'closed';
    try {
      const dates = eachCalendarDate(start, end);
      await upsertOverride({
        variables: {
          restaurantId: activeRestaurantId,
          date: start,
          endDate: end,
          mode: scheduleMode,
          reason: values.reason || null,
          startTime:
            scheduleMode === 'custom_hours' && values.startTime
              ? values.startTime.format('HH:mm')
              : null,
          endTime:
            scheduleMode === 'custom_hours' && values.endTime
              ? values.endTime.format('HH:mm')
              : null,
          status: requireApproval ? 'pending' : 'approved',
        },
      });
      if (editingIdsByDate) {
        const kept = new Set(dates);
        const removedIds = Object.entries(editingIdsByDate)
          .filter(([date]) => !kept.has(date))
          .map(([, id]) => id);
        if (removedIds.length > 0) {
          await Promise.all(removedIds.map((id) => deleteOverride({ variables: { id } })));
        }
      }
      const summary = rangeSummary(start, end, dates.length);
      message.success(
        editingIdsByDate
          ? `Special hours updated for ${summary}`
          : requireApproval
            ? `Pending approval saved for ${summary}`
            : `Special hours saved for ${summary}`,
      );
      resetHoursForm();
      refetchOverrides();
    } catch (err: unknown) {
      message.error(errorMessage(err, 'Failed to save special hours'));
    }
  };

  const startEditManual = (group: ScheduleOverride[]) => {
    const first = group[0]!;
    const last = group[group.length - 1]!;
    setEditingIdsByDate(Object.fromEntries(group.map((item) => [item.date, item.id])));
    hoursForm.setFieldsValue({
      dates: [dayjs(first.date), dayjs(last.date)],
      mode:
        first.status === 'pending'
          ? 'require_approval'
          : first.mode === 'custom_hours'
            ? 'custom_hours'
            : 'closed',
      reason: first.reason ?? undefined,
      startTime: first.startTime ? dayjs(first.startTime, 'HH:mm') : undefined,
      endTime: first.endTime ? dayjs(first.endTime, 'HH:mm') : undefined,
    });
    document.getElementById('special-hours-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHolidayClosing = async (item: ScheduleOverride, enabled: boolean) => {
    try {
      await reviewOverride({
        variables: { id: item.id, status: enabled ? 'approved' : 'rejected' },
      });
      message.success(enabled ? 'Closing enabled for this holiday' : 'Venue stays open on this holiday');
      refetchOverrides();
    } catch (err: unknown) {
      message.error(errorMessage(err, 'Failed to update holiday'));
    }
  };

  const handleDeleteGroup = async (group: BlackoutItem[]) => {
    try {
      await Promise.all(group.map((item) => deleteBlackout({ variables: { id: item.id } })));
      message.success(
        group.length === 1 ? 'Blackout removed' : `Removed ${group.length} blackout days`,
      );
      refetch();
    } catch (err: unknown) {
      message.error(errorMessage(err, 'Failed to delete blackout'));
    }
  };

  const blackouts = (blackoutsData?.blackouts ?? []) as BlackoutItem[];
  const overrides = (overridesData?.dateScheduleOverrides ?? []) as ScheduleOverride[];
  const { platformHolidays, manualGroups, blackoutGroups } = useMemo(() => {
    const platform: ScheduleOverride[] = [];
    const manual: ScheduleOverride[] = [];
    for (const item of overrides) {
      if (isPlatformHoliday(item)) platform.push(item);
      else manual.push(item);
    }
    return {
      platformHolidays: platform,
      manualGroups: groupConsecutive(
        manual,
        (a, b) =>
          a.mode === b.mode &&
          a.status === b.status &&
          (a.startTime ?? '') === (b.startTime ?? '') &&
          (a.endTime ?? '') === (b.endTime ?? '') &&
          (a.reason ?? '') === (b.reason ?? ''),
      ),
      blackoutGroups: groupConsecutive(
        blackouts,
        (a, b) => (a.reason ?? '') === (b.reason ?? '') && Boolean(a.allDay) === Boolean(b.allDay),
      ),
    };
  }, [overrides, blackouts]);

  const hoursMode = Form.useWatch('mode', hoursForm) as SpecialMode | undefined;

  return (
    <div component="BlackoutsPage" style={{ display: 'contents' }}>
      <PageHeader
        title="Closures & special hours"
        subtitle="Block booking for a day or a stretch of days, or replace the usual hours. Platform holidays stay in their own list."
        extra={
          <Select
            style={{ minWidth: 240 }}
            value={activeRestaurantId}
            onChange={setRestaurantId}
            options={buildRestaurantSelectOptions(restaurants)}
            placeholder="Location"
          />
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Blackout">
              <Paragraph type="secondary" style={{ marginTop: 0 }}>
                Stops online booking for every day you pick. Use this for a private buyout or a full closure.
              </Paragraph>
              <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
                <DateRangeField timeZone={timeZone} />
                <Form.Item name="reason" label="Reason">
                  <Input placeholder="Private event, renovation, holiday closure" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={creating}>
                  Save blackout
                </Button>
              </Form>
            </Card>

            <Card
              title="Blackout dates"
              extra={
                blackouts.length > 0 ? (
                  <Text type="secondary">
                    {blackouts.length} {blackouts.length === 1 ? 'day' : 'days'}
                  </Text>
                ) : null
              }
            >
              {blackoutGroups.length === 0 ? (
                <Text type="secondary">No blackouts for this location.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={blackoutGroups}
                  renderItem={(group) => {
                    const first = group[0]!;
                    const last = group[group.length - 1]!;
                    const label = rangeSummary(first.date, last.date, group.length);
                    return (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title="Remove this blackout?"
                            description={
                              group.length === 1
                                ? 'Online booking opens again for this day.'
                                : `Online booking opens again for these ${group.length} days.`
                            }
                            onConfirm={() => handleDeleteGroup(group)}
                          >
                            <Button size="small" danger type="text">
                              Delete
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <Space wrap>
                          <CalendarOutlined />
                          <Text strong>{label}</Text>
                          {first.reason ? <Text type="secondary">{first.reason}</Text> : null}
                          {first.allDay !== false ? <Tag>All day</Tag> : null}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={12}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card
              id="special-hours-form"
              title={editingIdsByDate ? 'Edit special hours' : 'Special hours'}
              extra={
                editingIdsByDate ? (
                  <Button type="link" size="small" onClick={resetHoursForm}>
                    Cancel
                  </Button>
                ) : null
              }
            >
              <Paragraph type="secondary" style={{ marginTop: 0 }}>
                Close the venue, shorten service, or hold a closure until staff approve it. The same
                setting applies to every day in the range.
              </Paragraph>
              <Form
                form={hoursForm}
                layout="vertical"
                onFinish={handleHoursFinish}
                initialValues={{ mode: 'closed' }}
                requiredMark="optional"
              >
                <DateRangeField timeZone={timeZone} />
                <Form.Item
                  name="mode"
                  label="What changes"
                  extra={MODE_HELP[hoursMode ?? 'closed']}
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { value: 'closed', label: 'Closed all day' },
                      { value: 'custom_hours', label: 'Custom open hours' },
                      { value: 'require_approval', label: 'Closed after staff approve' },
                    ]}
                  />
                </Form.Item>
                {hoursMode === 'custom_hours' ? (
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name="startTime"
                        label="Opens"
                        rules={[{ required: true, message: 'Select an open time' }]}
                      >
                        <TimePicker format="h:mm A" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="endTime"
                        label="Last seating"
                        rules={[{ required: true, message: 'Select a last seating time' }]}
                      >
                        <TimePicker format="h:mm A" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ) : null}
                <Form.Item name="reason" label="Reason">
                  <Input placeholder="Private event, shorter dinner service" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={savingOverride}>
                  {editingIdsByDate ? 'Update special hours' : 'Save special hours'}
                </Button>
              </Form>
            </Card>

            <Card
              title="Your schedule overrides"
              extra={
                manualGroups.length > 0 ? (
                  <Text type="secondary">
                    {manualGroups.reduce((sum, group) => sum + group.length, 0)} days
                  </Text>
                ) : null
              }
            >
              <Paragraph type="secondary" style={{ marginTop: 0 }}>
                Special hours you created. Consecutive days with the same setting show as one range.
              </Paragraph>
              {manualGroups.length === 0 ? (
                <Text type="secondary">No custom schedule overrides yet.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={manualGroups}
                  renderItem={(group) => {
                    const first = group[0]!;
                    const last = group[group.length - 1]!;
                    const label = rangeSummary(first.date, last.date, group.length);
                    return (
                      <List.Item
                        actions={[
                          ...(first.status === 'pending'
                            ? [
                                <Button
                                  key="approve"
                                  size="small"
                                  type="link"
                                  onClick={async () => {
                                    await Promise.all(
                                      group.map((item) =>
                                        reviewOverride({
                                          variables: { id: item.id, status: 'approved' },
                                        }),
                                      ),
                                    );
                                    message.success(
                                      group.length === 1 ? 'Approved' : `Approved ${group.length} days`,
                                    );
                                    refetchOverrides();
                                  }}
                                >
                                  Approve
                                </Button>,
                                <Button
                                  key="reject"
                                  size="small"
                                  type="link"
                                  danger
                                  onClick={async () => {
                                    await Promise.all(
                                      group.map((item) =>
                                        reviewOverride({
                                          variables: { id: item.id, status: 'rejected' },
                                        }),
                                      ),
                                    );
                                    message.success(
                                      group.length === 1 ? 'Rejected' : `Rejected ${group.length} days`,
                                    );
                                    refetchOverrides();
                                  }}
                                >
                                  Reject
                                </Button>,
                              ]
                            : []),
                          <Button
                            key="edit"
                            size="small"
                            type="link"
                            onClick={() => startEditManual(group)}
                          >
                            Edit
                          </Button>,
                          <Popconfirm
                            key="delete"
                            title="Remove this override?"
                            description={
                              group.length === 1
                                ? 'Regular hours apply again for this day.'
                                : `Regular hours apply again for these ${group.length} days.`
                            }
                            onConfirm={async () => {
                              try {
                                await Promise.all(
                                  group.map((item) => deleteOverride({ variables: { id: item.id } })),
                                );
                                if (
                                  editingIdsByDate &&
                                  group.some((item) => editingIdsByDate[item.date] === item.id)
                                ) {
                                  resetHoursForm();
                                }
                                message.success(
                                  group.length === 1 ? 'Removed' : `Removed ${group.length} days`,
                                );
                                refetchOverrides();
                              } catch (err: unknown) {
                                message.error(errorMessage(err, 'Failed to delete override'));
                              }
                            }}
                          >
                            <Button size="small" danger type="text">
                              Delete
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <Space wrap>
                          <Text strong>{label}</Text>
                          <Tag>{first.mode === 'custom_hours' ? 'Custom hours' : 'Closed'}</Tag>
                          <Tag
                            color={
                              first.status === 'approved'
                                ? 'green'
                                : first.status === 'pending'
                                  ? 'gold'
                                  : 'default'
                            }
                          >
                            {first.status === 'approved'
                              ? 'Active'
                              : first.status === 'pending'
                                ? 'Pending'
                                : first.status}
                          </Tag>
                          {first.mode === 'custom_hours' && first.startTime && first.endTime ? (
                            <Text type="secondary">
                              {dayjs(first.startTime, 'HH:mm').format('h:mm A')}–
                              {dayjs(first.endTime, 'HH:mm').format('h:mm A')}
                            </Text>
                          ) : null}
                          {first.reason ? <Text type="secondary">{first.reason}</Text> : null}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      <Card title="Platform holidays" style={{ marginTop: 16 }}>
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Turn <strong>Close</strong> on to close that day, or off to stay open. These days cannot be
          deleted or rewritten as special hours.
        </Paragraph>
        {platformHolidays.length === 0 ? (
          <Text type="secondary">No upcoming platform holidays for this location.</Text>
        ) : (
          <List
            size="small"
            dataSource={platformHolidays}
            renderItem={(item) => {
              const closingEnabled = item.status === 'approved';
              return (
                <List.Item
                  actions={[
                    <Switch
                      key="toggle"
                      checkedChildren="Close"
                      unCheckedChildren="Open"
                      checked={closingEnabled}
                      loading={reviewingHoliday}
                      onChange={(checked) => void handleHolidayClosing(item, checked)}
                    />,
                  ]}
                >
                  <Space wrap>
                    <Text strong>{dayjs(item.date).format('MMM D, YYYY')}</Text>
                    {item.reason ? <Text>{item.reason}</Text> : <Tag color="purple">Holiday</Tag>}
                    <Tag
                      color={
                        item.status === 'approved'
                          ? 'green'
                          : item.status === 'pending'
                            ? 'gold'
                            : 'default'
                      }
                    >
                      {item.status === 'approved'
                        ? 'Closing'
                        : item.status === 'rejected'
                          ? 'Staying open'
                          : 'Needs a decision'}
                    </Tag>
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
