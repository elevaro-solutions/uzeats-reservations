'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader, spacing } from '@reservations/ui';
import { useQuery } from '@/lib/apollo-hooks';
import { QA_CHECKLIST_DASHBOARD } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

type RunSummary = {
  release: string;
  envNote: string;
  p0Clear: boolean;
  notes: string;
  status: string;
  signedOffName: string;
  signedOffRole: string;
  signedAt: string | null;
  updatedAt: string | null;
  requiredTotal: number;
  requiredChecked: number;
  recommendedTotal: number;
  recommendedChecked: number;
  itemTotal: number;
  itemChecked: number;
  requiredDone: boolean;
  isCurrent: boolean;
};

type Dashboard = {
  currentRelease: string;
  totalRuns: number;
  signedRuns: number;
  activeRuns: number;
  averageRequiredProgress: number;
  current: RunSummary | null;
  runs: RunSummary[];
  recentSignOffs: Array<{
    release: string;
    signedOffName: string;
    signedOffRole: string;
    signedAt: string | null;
    status: string;
  }>;
};

function pct(checked: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((checked / total) * 100);
}

function whenLabel(iso: string | null) {
  if (!iso) return '—';
  return dayjs(iso).format('MMM D, YYYY · h:mm A');
}

export default function AdminQaDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const { data, loading } = useQuery(QA_CHECKLIST_DASHBOARD, { skip: !allowed });
  const dashboard = data?.qaChecklistDashboard as Dashboard | undefined;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  const columns: ColumnsType<RunSummary> = useMemo(
    () => [
      {
        title: 'Release',
        dataIndex: 'release',
        key: 'release',
        render: (release: string, row) => (
          <Space>
            <Link href={row.isCurrent ? '/admin/qa' : `/admin/qa?release=${encodeURIComponent(release)}`}>
              v{release}
            </Link>
            {row.isCurrent ? <Tag color="blue">Current</Tag> : null}
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag color={status === 'signed' ? 'green' : 'gold'}>{status}</Tag>
        ),
      },
      {
        title: 'Required',
        key: 'required',
        render: (_, row) => (
          <Space orientation="vertical" size={0}>
            <span>
              {row.requiredChecked}/{row.requiredTotal}
            </span>
            <Progress
              percent={pct(row.requiredChecked, row.requiredTotal)}
              size="small"
              status={row.status === 'signed' ? 'success' : 'active'}
              showInfo={false}
              style={{ width: 120, margin: 0 }}
            />
          </Space>
        ),
      },
      {
        title: 'Recommended',
        key: 'recommended',
        render: (_, row) => `${row.recommendedChecked}/${row.recommendedTotal}`,
      },
      {
        title: 'P0 clear',
        dataIndex: 'p0Clear',
        key: 'p0Clear',
        render: (clear: boolean) => (clear ? 'Yes' : 'No'),
      },
      {
        title: 'Sign-off',
        key: 'signoff',
        render: (_, row) =>
          row.status === 'signed'
            ? `${row.signedOffName || 'QA'}${row.signedAt ? ` · ${whenLabel(row.signedAt)}` : ''}`
            : '—',
      },
      {
        title: 'Updated',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (value: string | null) => whenLabel(value),
      },
    ],
    [],
  );

  if (!allowed) return null;

  const current = dashboard?.current;

  return (
    <div>
      <PageHeader
        title="QA dashboard"
        subtitle="Progress across every saved checklist run. Open History for notes and full detail."
        extra={
          <Space>
            <Link href="/admin/qa">Checklist</Link>
            <Link href="/admin/qa/history">History</Link>
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: spacing.lg }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Checklist runs" value={dashboard?.totalRuns ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Signed off" value={dashboard?.signedRuns ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Still active" value={dashboard?.activeRuns ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Avg required progress"
              value={dashboard?.averageRequiredProgress ?? 0}
              suffix="%"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: spacing.lg }} title={`Current gate · v${dashboard?.currentRelease ?? '—'}`}>
        {current ? (
          <Row gutter={[24, 16]}>
            <Col xs={24} md={10}>
              <Typography.Text type="secondary">Required items</Typography.Text>
              <Progress
                percent={pct(current.requiredChecked, current.requiredTotal)}
                status={current.status === 'signed' ? 'success' : 'active'}
                format={() => `${current.requiredChecked}/${current.requiredTotal}`}
              />
              <Typography.Text type="secondary">All items</Typography.Text>
              <Progress
                percent={pct(current.itemChecked, current.itemTotal)}
                format={() => `${current.itemChecked}/${current.itemTotal}`}
              />
            </Col>
            <Col xs={24} md={14}>
              <Space orientation="vertical" size="small">
                <div>
                  Status:{' '}
                  <Tag color={current.status === 'signed' ? 'green' : 'gold'}>{current.status}</Tag>
                  {current.p0Clear ? <Tag color="green">P0 clear</Tag> : <Tag>P0 open</Tag>}
                </div>
                <Typography.Text type="secondary">
                  Updated {whenLabel(current.updatedAt)}
                  {current.signedOffName
                    ? ` · Signed by ${current.signedOffName}${
                        current.signedAt ? ` on ${whenLabel(current.signedAt)}` : ''
                      }`
                    : ''}
                </Typography.Text>
                <Link href="/admin/qa">Open current checklist</Link>
              </Space>
            </Col>
          </Row>
        ) : (
          <Typography.Text type="secondary">
            {loading ? 'Loading…' : 'No current checklist yet.'}
          </Typography.Text>
        )}
      </Card>

      <Card title="All runs" style={{ marginBottom: spacing.lg }}>
        <Table
          rowKey="release"
          loading={loading}
          columns={columns}
          dataSource={dashboard?.runs ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No QA checklist runs saved yet.' }}
        />
      </Card>

      <Card title="Recent sign-offs">
        {(dashboard?.recentSignOffs ?? []).length === 0 ? (
          <Typography.Text type="secondary">No signed releases yet.</Typography.Text>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }}>
            {(dashboard?.recentSignOffs ?? []).map((entry) => (
              <div key={`${entry.release}-${entry.signedAt}`}>
                <Link href={`/admin/qa?release=${encodeURIComponent(entry.release)}`}>
                  v{entry.release}
                </Link>
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  {entry.signedOffName || 'QA'}
                  {entry.signedOffRole ? ` (${entry.signedOffRole})` : ''}
                  {entry.signedAt ? ` · ${whenLabel(entry.signedAt)}` : ''}
                </Typography.Text>
              </div>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}
