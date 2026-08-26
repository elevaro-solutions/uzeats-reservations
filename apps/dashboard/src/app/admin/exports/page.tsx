'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  DatePicker,
  Radio,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { EXPORT_ADMIN_CSV } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import dayjs, { type Dayjs } from 'dayjs';

const { Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

type ExportFormat = 'csv' | 'json' | 'pdf';

const EXPORTS = [
  { type: 'users', label: 'Users', desc: 'Accounts with role, verification, and join date' },
  {
    type: 'restaurants',
    label: 'Restaurants',
    desc: 'Venues with status, location, ratings, and owner',
  },
  { type: 'reservations', label: 'Reservations', desc: 'Bookings by slot date in the selected range' },
  {
    type: 'invoices',
    label: 'Invoices',
    desc: 'Platform invoices overlapping the selected billing periods',
  },
  {
    type: 'revenue',
    label: 'Revenue summary',
    desc: 'MRR, collections, covers, and subscription counts',
  },
  {
    type: 'subscriptions',
    label: 'Subscriptions',
    desc: 'Plan, fees, and status for every venue',
  },
  {
    type: 'cover_fees',
    label: 'Cover fees',
    desc: 'Per-cover charges billed to restaurants',
  },
  {
    type: 'support_tickets',
    label: 'Support tickets',
    desc: 'Helpdesk tickets with status and priority',
  },
  { type: 'reviews', label: 'Reviews', desc: 'Guest ratings, comments, and moderation flags' },
  { type: 'audit_logs', label: 'Audit logs', desc: 'Admin actions for compliance and debugging' },
];

const PRESETS = [
  { label: 'This month', value: 'month' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom range', value: 'custom' },
  { label: 'All time', value: 'all' },
];

function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
  encoding: string,
) {
  const blob =
    encoding === 'base64'
      ? new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], { type: mimeType })
      : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportsPage() {
  const { ready } = useRequireAdmin();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [preset, setPreset] = useState<string>('month');
  const [month, setMonth] = useState(() => dayjs());
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportCsv] = useMutation(EXPORT_ADMIN_CSV);

  const rangeVariables = useMemo(() => {
    if (preset === 'all') {
      return { period: 'all' as string | undefined, startDate: undefined, endDate: undefined };
    }
    if (preset === 'month') {
      return {
        period: month.format('YYYY-MM'),
        startDate: undefined as string | undefined,
        endDate: undefined as string | undefined,
      };
    }
    if (preset === '30d' || preset === '90d') {
      const days = preset === '30d' ? 30 : 90;
      const end = dayjs();
      const start = end.subtract(days - 1, 'day');
      return {
        period: undefined,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
      };
    }
    if (preset === 'custom' && customRange?.[0] && customRange?.[1]) {
      return {
        period: undefined,
        startDate: customRange[0].format('YYYY-MM-DD'),
        endDate: customRange[1].format('YYYY-MM-DD'),
      };
    }
    return {
      period: dayjs().format('YYYY-MM'),
      startDate: undefined,
      endDate: undefined,
    };
  }, [preset, month, customRange]);

  if (!ready) return null;

  const run = async (type: string) => {
    if (preset === 'custom' && (!customRange?.[0] || !customRange?.[1])) {
      message.warning('Pick a start and end date');
      return;
    }
    if (type === 'revenue' && preset === 'all') {
      message.warning('Revenue export needs a month or date range');
      return;
    }
    setExportingType(type);
    try {
      const res = await exportCsv({
        variables: {
          type,
          format,
          period: rangeVariables.period,
          startDate: rangeVariables.startDate,
          endDate: rangeVariables.endDate,
        },
      });
      const payload = res.data?.exportAdminCsv;
      downloadFile(payload.filename, payload.content, payload.mimeType, payload.encoding);
      message.success(`Exported ${payload.rowCount} rows as ${format.toUpperCase()}`);
    } catch (err: any) {
      message.error(err.message || 'Export failed');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div component="AdminExportsPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Data exports"
          subtitle="Download finance, venue, and support datasets as CSV, JSON, or PDF."
        />

        <Card size="small">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Date range
              </Text>
              <Space wrap>
                <Select
                  value={preset}
                  onChange={setPreset}
                  options={PRESETS}
                  style={{ width: 160 }}
                />
                {preset === 'month' && (
                  <DatePicker
                    picker="month"
                    value={month}
                    onChange={(v) => v && setMonth(v)}
                    allowClear={false}
                  />
                )}
                {preset === 'custom' && (
                  <RangePicker
                    value={customRange}
                    onChange={(v) =>
                      setCustomRange(v && v[0] && v[1] ? [v[0], v[1]] : null)
                    }
                  />
                )}
              </Space>
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Format
              </Text>
              <Radio.Group
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: 'CSV', value: 'csv' },
                  { label: 'JSON', value: 'json' },
                  { label: 'PDF', value: 'pdf' },
                ]}
              />
            </div>
          </Space>
        </Card>

        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          {EXPORTS.map((item) => (
            <Card key={item.type}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <div>
                  <strong>{item.label}</strong>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {item.desc}
                  </Paragraph>
                </div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={exportingType === item.type}
                  disabled={exportingType !== null && exportingType !== item.type}
                  onClick={() => run(item.type)}
                >
                  Download {format.toUpperCase()}
                </Button>
              </Space>
            </Card>
          ))}
        </Space>
      </Space>
    </div>
  );
}
