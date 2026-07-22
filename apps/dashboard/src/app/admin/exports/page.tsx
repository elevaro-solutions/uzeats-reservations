'use client';

import { useState } from 'react';
import { useMutation } from '@/lib/apollo-hooks';
import { Button, Card, Input, Space, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { EXPORT_ADMIN_CSV } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

const { Paragraph } = Typography;

const EXPORTS = [
  { type: 'users', label: 'Users', desc: 'All accounts with role and join date' },
  { type: 'invoices', label: 'Invoices', desc: 'Platform invoices for the selected period' },
  { type: 'revenue', label: 'Revenue summary', desc: 'MRR, collections, and cover fees' },
  { type: 'subscriptions', label: 'Subscriptions', desc: 'Plan and status for every venue' },
];

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportsPage() {
  const { ready } = useRequireAdmin();
  const [period, setPeriod] = useState(currentPeriod());
  const [exportCsv, { loading }] = useMutation(EXPORT_ADMIN_CSV);

  if (!ready) return null;

  const run = async (type: string) => {
    try {
      const res = await exportCsv({ variables: { type, period } });
      const payload = res.data?.exportAdminCsv;
      downloadCsv(payload.filename, payload.content);
      message.success(`Exported ${payload.rowCount} rows`);
    } catch (err: any) {
      message.error(err.message || 'Export failed');
    }
  };

  return (
    <div component="AdminExportsPage" style={{ display: 'contents' }}><Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
      <PageHeader
        title="CSV exports"
        subtitle="Download finance and support datasets for spreadsheets or BI tools."
        extra={
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: 160 }}
          />
        }
      />
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        {EXPORTS.map((item) => (
          <Card key={item.type}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <strong>{item.label}</strong>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {item.desc}
                </Paragraph>
              </div>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={loading}
                onClick={() => run(item.type)}
              >
                Download
              </Button>
            </Space>
          </Card>
        ))}
      </Space>
    </Space></div>
  );
}
