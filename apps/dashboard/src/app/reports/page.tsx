'use client';

import { useEffect, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  InputNumber,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '@/lib/auth';
import {
  MY_RESTAURANTS,
  PRE_SHIFT_REPORT,
  REVENUE_FORECAST,
  CUSTOM_REPORT,
  MULTI_LOCATION_ANALYTICS,
} from '@/lib/graphql';

const { Title, Text } = Typography;

const dollars = (cents: number) => `$${((cents ?? 0) / 100).toFixed(2)}`;

const METRIC_OPTIONS = [
  { value: 'reservations', label: 'Reservations' },
  { value: 'covers', label: 'Covers' },
  { value: 'revenueCents', label: 'Revenue' },
  { value: 'noShows', label: 'No-shows' },
  { value: 'cancellations', label: 'Cancellations' },
];

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
  { value: 'occasion', label: 'Occasion' },
];

function PreShiftTab({ restaurantId }: { restaurantId?: string }) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const { data, loading, error } = useQuery(PRE_SHIFT_REPORT, {
    skip: !restaurantId,
    variables: { restaurantId, date: date.format('YYYY-MM-DD') },
    onError: (err) => message.error(err.message),
  });

  const report = data?.preShiftReport;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <DatePicker value={date} allowClear={false} onChange={(d) => d && setDate(d)} />
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print briefing
        </Button>
      </Space>

      {error && <Empty description="Report unavailable" />}
      {report && (
        <>
          <Card size="small">
            <Space size={32} wrap>
              <Statistic title="Reservations" value={report.totalReservations} />
              <Statistic title="Covers" value={report.totalCovers} />
              <Statistic title="VIPs" value={report.vipCount} />
              <Statistic title="Occasions" value={report.occasionCount} />
              <Statistic title="Allergies" value={report.allergyCount} />
            </Space>
          </Card>
          <Card
            title={`Daily briefing — ${report.date}${report.shiftName ? ` (${report.shiftName})` : ''}`}
            loading={loading}
          >
            {(report.entries ?? []).length === 0 ? (
              <Empty description="No reservations for this date" />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {(report.entries ?? []).map((e: any) => (
                  <Card key={e.reservationId} size="small">
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space wrap>
                        <Text strong>{dayjs(e.slotStart).format('HH:mm')}</Text>
                        <Text strong>{e.guestName}</Text>
                        <Tag>Party of {e.partySize}</Tag>
                        {e.vipStatus === 'vip' && <Tag color="gold">VIP</Tag>}
                        {e.vipStatus === 'blacklisted' && <Tag color="red">Blacklisted</Tag>}
                        {e.occasion && e.occasion !== 'none' && (
                          <Tag color="purple">{e.occasion}</Tag>
                        )}
                        {(e.tags ?? []).map((t: string) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                        <Tag color="blue">{e.totalVisits} visits</Tag>
                        <Text type="secondary">{e.status}</Text>
                      </Space>
                      {(e.allergies ?? []).length > 0 && (
                        <Text type="danger">Allergies: {e.allergies.join(', ')}</Text>
                      )}
                      {(e.dietaryRestrictions ?? []).length > 0 && (
                        <Text>Dietary: {e.dietaryRestrictions.join(', ')}</Text>
                      )}
                      {e.guestNotes && <Text>Guest notes: {e.guestNotes}</Text>}
                      {e.profileNotes && (
                        <Text type="secondary">Profile notes: {e.profileNotes}</Text>
                      )}
                      {e.guestPhone && <Text type="secondary">{e.guestPhone}</Text>}
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </>
      )}
    </Space>
  );
}

function ForecastTab({ restaurantId }: { restaurantId?: string }) {
  const [days, setDays] = useState<number>(14);
  const { data, loading } = useQuery(REVENUE_FORECAST, {
    skip: !restaurantId,
    variables: { restaurantId, days },
    onError: (err) => message.error(err.message),
  });

  const forecast = data?.revenueForecast;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Text>Forecast horizon (days):</Text>
        <InputNumber min={1} max={90} value={days} onChange={(v) => v && setDays(v)} />
      </Space>
      {forecast && (
        <Card size="small">
          <Space size={32} wrap>
            <Statistic title="Projected covers" value={forecast.totalProjectedCovers} />
            <Statistic
              title="Projected revenue"
              value={(forecast.totalProjectedRevenueCents ?? 0) / 100}
              precision={2}
              prefix="$"
            />
            <Statistic title="Based on reservations" value={forecast.basedOnReservations} />
          </Space>
        </Card>
      )}
      <Table
        loading={loading}
        rowKey="date"
        pagination={false}
        dataSource={forecast?.points ?? []}
        columns={[
          { title: 'Date', dataIndex: 'date' },
          { title: 'Projected covers', dataIndex: 'projectedCovers' },
          {
            title: 'Projected revenue',
            dataIndex: 'projectedRevenueCents',
            render: (v: number) => dollars(v),
          },
        ]}
      />
    </Space>
  );
}

function CustomReportTab({ restaurantId }: { restaurantId?: string }) {
  const [form] = Form.useForm();
  const [runReport, { data, loading }] = useLazyQuery(CUSTOM_REPORT, {
    fetchPolicy: 'network-only',
    onError: (err) => message.error(err.message),
  });

  const rows = data?.customReport ?? [];
  const metricsInRows: string[] = rows.length
    ? rows[0].values.map((v: any) => v.metric)
    : [];

  const handleRun = async () => {
    if (!restaurantId) return;
    const values = await form.validateFields();
    const [start, end] = values.range as [Dayjs, Dayjs];
    runReport({
      variables: {
        input: {
          restaurantId,
          metrics: values.metrics,
          groupBy: values.groupBy,
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD'),
        },
      },
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Form
        form={form}
        layout="inline"
        initialValues={{
          metrics: ['reservations', 'covers'],
          groupBy: 'day',
          range: [dayjs().subtract(30, 'day'), dayjs()],
        }}
      >
        <Form.Item name="metrics" label="Metrics" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            style={{ minWidth: 260 }}
            options={METRIC_OPTIONS}
          />
        </Form.Item>
        <Form.Item name="groupBy" label="Group by" rules={[{ required: true }]}>
          <Select style={{ width: 140 }} options={GROUP_BY_OPTIONS} />
        </Form.Item>
        <Form.Item name="range" label="Date range" rules={[{ required: true }]}>
          <DatePicker.RangePicker />
        </Form.Item>
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleRun}>
          Run report
        </Button>
      </Form>

      <Table
        loading={loading}
        rowKey="group"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: 'Run a report to see results' }}
        columns={[
          { title: 'Group', dataIndex: 'group' },
          ...metricsInRows.map((metric) => ({
            title: METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric,
            key: metric,
            render: (_: any, row: any) => {
              const value = row.values.find((v: any) => v.metric === metric)?.value ?? 0;
              return metric === 'revenueCents' ? dollars(value) : value;
            },
          })),
        ]}
      />
    </Space>
  );
}

function MultiLocationTab() {
  const [period, setPeriod] = useState<Dayjs | null>(dayjs());
  const { data, loading } = useQuery(MULTI_LOCATION_ANALYTICS, {
    variables: { period: period ? period.format('YYYY-MM') : undefined },
    onError: (err) => message.error(err.message),
  });

  const analytics = data?.multiLocationAnalytics;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Text>Month:</Text>
        <DatePicker picker="month" value={period} onChange={setPeriod} />
      </Space>
      {analytics && (
        <Card size="small">
          <Space size={32} wrap>
            <Statistic title="Total reservations" value={analytics.totalReservations} />
            <Statistic title="Total covers" value={analytics.totalCovers} />
            <Statistic
              title="Total revenue"
              value={(analytics.totalRevenueCents ?? 0) / 100}
              precision={2}
              prefix="$"
            />
          </Space>
        </Card>
      )}
      <Table
        loading={loading}
        rowKey={(r: any) => r.restaurant?.id}
        pagination={false}
        dataSource={analytics?.locations ?? []}
        columns={[
          {
            title: 'Location',
            key: 'location',
            render: (_: any, r: any) => (
              <Space direction="vertical" size={0}>
                <Text strong>{r.restaurant?.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.restaurant?.address
                    ? `${r.restaurant.address.city}, ${r.restaurant.address.state}`
                    : ''}
                </Text>
              </Space>
            ),
          },
          { title: 'Reservations', dataIndex: 'reservations' },
          { title: 'Covers', dataIndex: 'covers' },
          {
            title: 'Revenue',
            dataIndex: 'revenueCents',
            render: (v: number) => dollars(v),
          },
          { title: 'No-shows', dataIndex: 'noShows' },
          { title: 'Cancellations', dataIndex: 'cancellations' },
          {
            title: 'Avg rating',
            dataIndex: 'averageRating',
            render: (v: number) => (v ? v.toFixed(1) : '—'),
          },
        ]}
      />
    </Space>
  );
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>();

  const { data: restData } = useQuery(MY_RESTAURANTS, { skip: !user });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    setRestaurantId(
      localStorage.getItem('activeRestaurantId') ?? restData?.myRestaurants?.[0]?.id,
    );
  }, [restData]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={2}>Reports</Title>
      <Select
        style={{ width: 260 }}
        value={restaurantId}
        onChange={(id) => {
          setRestaurantId(id);
          localStorage.setItem('activeRestaurantId', id);
        }}
        options={(restData?.myRestaurants ?? []).map((r: any) => ({
          value: r.id,
          label: r.name,
        }))}
      />

      <Card>
        <Tabs
          defaultActiveKey="preshift"
          items={[
            {
              key: 'preshift',
              label: 'Pre-shift',
              children: <PreShiftTab restaurantId={restaurantId} />,
            },
            {
              key: 'forecast',
              label: 'Revenue forecast',
              children: <ForecastTab restaurantId={restaurantId} />,
            },
            {
              key: 'custom',
              label: 'Custom reports',
              children: <CustomReportTab restaurantId={restaurantId} />,
            },
            {
              key: 'multi',
              label: 'Multi-location',
              children: <MultiLocationTab />,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
