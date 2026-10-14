'use client';

import { useEffect, useMemo } from 'react';
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
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  DEFAULT_PLATFORM_HOLIDAYS,
  isPastCalendarDay,
  platformHolidaySelectOptions,
  resolveHolidayDate,
  restaurantTimeZone,
} from '@reservations/shared';
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
  PLATFORM_HOLIDAYS,
} from '@/lib/graphql';
import { buildRestaurantSelectOptions, validatedRestaurantId } from '@/lib/restaurants';
import { useActiveRestaurant } from '@/lib/useActiveRestaurant';

const { Title, Text } = Typography;

type SpecialMode = 'closed' | 'custom_hours' | 'require_approval';

export default function BlackoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [hoursForm] = Form.useForm();
  const { data } = useQuery(MY_RESTAURANTS, { skip: !user });
  const { data: holidaysData } = useQuery(PLATFORM_HOLIDAYS, { skip: !user });
  const restaurants = data?.myRestaurants ?? [];
  const restaurantIds = restaurants.map((r: { id: string }) => r.id);
  const { restaurantId, setRestaurantId } = useActiveRestaurant(restaurantIds);
  const activeRestaurantId = validatedRestaurantId(restaurantId, restaurantIds);
  const activeRestaurant = restaurants.find((r: { id: string }) => r.id === activeRestaurantId);
  const timeZone = restaurantTimeZone(activeRestaurant ?? {});

  const holidayOptions = useMemo(() => {
    const fromApi = holidaysData?.platformHolidays;
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      return platformHolidaySelectOptions(fromApi);
    }
    return platformHolidaySelectOptions(DEFAULT_PLATFORM_HOLIDAYS);
  }, [holidaysData]);

  const holidaysByKey = useMemo(() => {
    const list =
      Array.isArray(holidaysData?.platformHolidays) && holidaysData.platformHolidays.length > 0
        ? holidaysData.platformHolidays
        : DEFAULT_PLATFORM_HOLIDAYS;
    return new Map(list.map((h: { key: string }) => [h.key, h]));
  }, [holidaysData]);

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
  const [reviewOverride] = useMutation(REVIEW_DATE_SCHEDULE_OVERRIDE);
  const [deleteOverride] = useMutation(DELETE_DATE_SCHEDULE_OVERRIDE);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleFinish = async (values: {
    date: dayjs.Dayjs;
    reason?: string;
    allDay?: boolean;
  }) => {
    if (!activeRestaurantId) return;
    try {
      await createBlackout({
        variables: {
          restaurantId: activeRestaurantId,
          date: values.date.format('YYYY-MM-DD'),
          reason: values.reason || null,
          allDay: values.allDay ?? true,
        },
      });
      message.success('Blackout created');
      form.resetFields();
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to create blackout');
    }
  };

  const applyHolidayToForm = (holidayKey: string | null | undefined) => {
    if (!holidayKey) return;
    const holiday = holidaysByKey.get(holidayKey) as
      | (typeof DEFAULT_PLATFORM_HOLIDAYS)[number]
      | undefined;
    if (!holiday) return;
    const year = new Date().getFullYear();
    const dateStr = resolveHolidayDate(holiday, year);
    if (dateStr) {
      hoursForm.setFieldsValue({
        date: dayjs(dateStr),
        reason: holiday.name,
        holidayKey,
      });
    } else {
      hoursForm.setFieldsValue({ reason: holiday.name, holidayKey });
    }
  };

  const handleHoursFinish = async (values: {
    date: dayjs.Dayjs;
    mode: SpecialMode;
    reason?: string;
    holidayKey?: string;
    startTime?: dayjs.Dayjs;
    endTime?: dayjs.Dayjs;
  }) => {
    if (!activeRestaurantId) return;
    const requireApproval = values.mode === 'require_approval';
    const scheduleMode =
      values.mode === 'custom_hours' ? 'custom_hours' : 'closed';
    try {
      await upsertOverride({
        variables: {
          restaurantId: activeRestaurantId,
          date: values.date.format('YYYY-MM-DD'),
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
          holidayKey: values.holidayKey || null,
        },
      });
      message.success(
        requireApproval
          ? 'Pending approval saved — staff must approve before this day closes'
          : 'Special hours saved',
      );
      hoursForm.resetFields();
      hoursForm.setFieldsValue({ mode: 'closed' });
      refetchOverrides();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to save special hours');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlackout({ variables: { id } });
      message.success('Blackout removed');
      refetch();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to delete blackout');
    }
  };

  const blackouts = blackoutsData?.blackouts ?? [];
  const overrides = overridesData?.dateScheduleOverrides ?? [];

  return (
    <div component="BlackoutsPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Title level={2}>Closures & special hours</Title>
        <Text type="secondary">
          Close a day, set custom open hours, or queue a date for staff approval. Major holidays
          appear as pending until approved.
        </Text>
        <Select
          style={{ width: 320 }}
          value={activeRestaurantId}
          onChange={setRestaurantId}
          options={buildRestaurantSelectOptions(restaurants)}
        />

        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title="Create blackout">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{ allDay: true }}
              >
                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: 'Select a date' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
                  />
                </Form.Item>
                <Form.Item name="reason" label="Reason">
                  <Input placeholder="e.g. Private event, holiday closure" />
                </Form.Item>
                <Form.Item name="allDay" label="All day" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={creating}>
                  Create blackout
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Special hours for a date">
              <Form
                form={hoursForm}
                layout="vertical"
                onFinish={handleHoursFinish}
                initialValues={{ mode: 'closed' }}
              >
                <Form.Item
                  name="holidayKey"
                  label="Holiday (optional)"
                  extra="Pick a catalog holiday to fill the date and reason. Keys are shown in parentheses."
                >
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="e.g. Christmas Day (christmas_day)"
                    options={holidayOptions}
                    onChange={(key) => applyHolidayToForm(key)}
                  />
                </Form.Item>
                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: 'Select a date' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={(d) => isPastCalendarDay(d.format('YYYY-MM-DD'), timeZone)}
                  />
                </Form.Item>
                <Form.Item name="mode" label="Mode" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: 'closed', label: 'Closed all day (apply now)' },
                      { value: 'custom_hours', label: 'Custom open hours (apply now)' },
                      {
                        value: 'require_approval',
                        label: 'Require staff / manual approval before closing',
                      },
                    ]}
                  />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.mode !== next.mode}>
                  {() =>
                    hoursForm.getFieldValue('mode') === 'custom_hours' ? (
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            name="startTime"
                            label="Opens"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <TimePicker format="HH:mm" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="endTime"
                            label="Last seating"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <TimePicker format="HH:mm" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    ) : hoursForm.getFieldValue('mode') === 'require_approval' ? (
                      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        Saves as <strong>pending</strong>. The venue stays open until a host,
                        manager, or owner approves this closure in the list below.
                      </Text>
                    ) : null
                  }
                </Form.Item>
                <Form.Item name="reason" label="Reason">
                  <Input placeholder="e.g. Christmas Eve — shorter dinner service" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={savingOverride}>
                  Save special hours
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title="Blackout dates">
              {blackouts.length === 0 ? (
                <Text type="secondary">No blackout dates for this location.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={blackouts}
                  renderItem={(item: {
                    id: string;
                    date: string;
                    reason?: string;
                    allDay?: boolean;
                  }) => (
                    <List.Item
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Remove this blackout?"
                          onConfirm={() => handleDelete(item.id)}
                        >
                          <Button size="small" danger type="text">
                            Delete
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text strong>{item.date}</Text>
                        {item.reason && <Text type="secondary">— {item.reason}</Text>}
                        {item.allDay && <Tag>All day</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Schedule overrides">
              {overrides.length === 0 ? (
                <Text type="secondary">No special hours or pending holiday closures.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={overrides}
                  renderItem={(item: {
                    id: string;
                    date: string;
                    mode: string;
                    startTime?: string | null;
                    endTime?: string | null;
                    reason?: string | null;
                    status: string;
                    holidayKey?: string | null;
                  }) => (
                    <List.Item
                      actions={[
                        ...(item.status === 'pending'
                          ? [
                              <Button
                                key="approve"
                                size="small"
                                type="link"
                                onClick={async () => {
                                  await reviewOverride({
                                    variables: { id: item.id, status: 'approved' },
                                  });
                                  message.success('Approved');
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
                                  await reviewOverride({
                                    variables: { id: item.id, status: 'rejected' },
                                  });
                                  message.success('Rejected');
                                  refetchOverrides();
                                }}
                              >
                                Reject
                              </Button>,
                            ]
                          : []),
                        <Popconfirm
                          key="delete"
                          title="Remove this override?"
                          onConfirm={async () => {
                            await deleteOverride({ variables: { id: item.id } });
                            message.success('Removed');
                            refetchOverrides();
                          }}
                        >
                          <Button size="small" danger type="text">
                            Delete
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <Space wrap>
                        <Text strong>{item.date}</Text>
                        <Tag>{item.mode === 'custom_hours' ? 'Custom hours' : 'Closed'}</Tag>
                        <Tag
                          color={
                            item.status === 'approved'
                              ? 'green'
                              : item.status === 'pending'
                                ? 'gold'
                                : 'default'
                          }
                        >
                          {item.status}
                        </Tag>
                        {item.mode === 'custom_hours' && item.startTime && item.endTime ? (
                          <Text type="secondary">
                            {item.startTime}–{item.endTime}
                          </Text>
                        ) : null}
                        {item.reason ? <Text type="secondary">— {item.reason}</Text> : null}
                        {item.holidayKey ? <Tag>{item.holidayKey}</Tag> : null}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
