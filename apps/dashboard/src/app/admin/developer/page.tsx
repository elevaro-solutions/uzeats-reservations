'use client';

import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Card,
  Descriptions,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { DEVELOPER_INFO } from '@/lib/graphql';
import { useRequireSuperAdmin } from '@/lib/useRequireSuperAdmin';

const { Text, Paragraph } = Typography;

type EnvAppFilter = 'all' | 'api' | 'web' | 'dashboard';
type EnvRequirementFilter = 'required' | 'production' | 'recommended';
type EnvStatusFilter = 'missing' | 'set' | 'unset';

type EnvVarRow = {
  key: string;
  app: string;
  appLabel: string;
  label: string;
  group: string;
  groupLabel: string;
  requirement: string;
  description?: string | null;
  value?: string | null;
  configured: boolean;
  applicable: boolean;
  missing: boolean;
};

const REQUIREMENT_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'production', label: 'Production' },
  { value: 'recommended', label: 'Recommended' },
];

const STATUS_OPTIONS = [
  { value: 'missing', label: 'Missing' },
  { value: 'set', label: 'Set' },
  { value: 'unset', label: 'Unset' },
];

function requirementTag(requirement: string) {
  switch (requirement) {
    case 'required':
      return <Tag color="red">Required</Tag>;
    case 'production':
      return <Tag color="orange">Production</Tag>;
    default:
      return <Tag>Recommended</Tag>;
  }
}

function getRowStatus(row: EnvVarRow): EnvStatusFilter {
  if (row.missing) return 'missing';
  if (row.configured) return 'set';
  return 'unset';
}

function filterEnvRows(
  rows: EnvVarRow[],
  requirement: EnvRequirementFilter | undefined,
  status: EnvStatusFilter | undefined,
  group: string | undefined,
): EnvVarRow[] {
  return rows.filter((row) => {
    if (requirement && row.requirement !== requirement) return false;
    if (status && getRowStatus(row) !== status) return false;
    if (group && row.group !== group) return false;
    return true;
  });
}

function EnvVarTable({
  loading,
  rows,
  showAppColumn,
}: {
  loading: boolean;
  rows: EnvVarRow[];
  showAppColumn: boolean;
}) {
  return (
    <Table
      loading={loading}
      rowKey={(row) => `${row.app}:${row.key}`}
      dataSource={rows}
      pagination={false}
      size="middle"
      columns={[
        ...(showAppColumn
          ? [
              {
                title: 'App',
                dataIndex: 'appLabel',
                width: 110,
              },
            ]
          : []),
        {
          title: 'Variable',
          dataIndex: 'key',
          width: 280,
          render: (key: string, row: EnvVarRow) => (
            <div>
              <Text code>{key}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {row.label}
                </Text>
              </div>
            </div>
          ),
        },
        {
          title: 'Value',
          dataIndex: 'value',
          width: 280,
          render: (value: string | null | undefined) =>
            value ? (
              <Text copyable={{ text: value }} style={{ wordBreak: 'break-all' }}>
                {value}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: 'Group',
          dataIndex: 'groupLabel',
          width: 140,
        },
        {
          title: 'Requirement',
          dataIndex: 'requirement',
          width: 130,
          render: (value: string) => requirementTag(value),
        },
        {
          title: 'Status',
          key: 'status',
          width: 120,
          render: (_: unknown, row: EnvVarRow) =>
            row.missing ? (
              <Tag color="error">Missing</Tag>
            ) : row.configured ? (
              <Tag color="success">Set</Tag>
            ) : (
              <Tag>Unset</Tag>
            ),
        },
        {
          title: 'Notes',
          dataIndex: 'description',
          ellipsis: true,
          render: (value: string | null | undefined) => value || '—',
        },
      ]}
    />
  );
}

function EnvVarTabPanel({
  loading,
  rows,
  totalRows,
  showAppColumn,
  hasFilters,
}: {
  loading: boolean;
  rows: EnvVarRow[];
  totalRows: number;
  showAppColumn: boolean;
  hasFilters: boolean;
}) {
  return (
    <Space orientation="vertical" size={spacing.md} style={{ width: '100%' }}>
      {hasFilters && (
        <Text type="secondary">
          Showing {rows.length} of {totalRows} variable{totalRows === 1 ? '' : 's'}
        </Text>
      )}
      <EnvVarTable loading={loading} rows={rows} showAppColumn={showAppColumn} />
    </Space>
  );
}

function DeveloperPageContent() {
  const { ready } = useRequireSuperAdmin();
  const [activeTab, setActiveTab] = useState<EnvAppFilter>('all');
  const [requirement, setRequirement] = useState<EnvRequirementFilter | undefined>();
  const [status, setStatus] = useState<EnvStatusFilter | undefined>();
  const [group, setGroup] = useState<string | undefined>();

  const { data, loading } = useQuery(DEVELOPER_INFO, {
    skip: !ready,
    fetchPolicy: 'network-only',
  });

  const info = data?.developerInfo;
  const envVars: EnvVarRow[] = info?.envVars ?? [];

  const applicableRows = useMemo(
    () => envVars.filter((row) => row.applicable),
    [envVars],
  );

  const groupOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const row of applicableRows) {
      labels.set(row.group, row.groupLabel);
    }
    return Array.from(labels.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [applicableRows]);

  const filteredRows = useMemo(
    () => filterEnvRows(applicableRows, requirement, status, group),
    [applicableRows, requirement, status, group],
  );

  const missingRequired = useMemo(
    () => envVars.filter((row) => row.app === 'api' && row.missing),
    [envVars],
  );

  const tabCounts = useMemo(
    () => ({
      all: filteredRows.length,
      api: filteredRows.filter((row) => row.app === 'api').length,
      web: filteredRows.filter((row) => row.app === 'web').length,
      dashboard: filteredRows.filter((row) => row.app === 'dashboard').length,
    }),
    [filteredRows],
  );

  const hasFilters =
    requirement !== undefined || status !== undefined || group !== undefined;

  if (!ready) return null;

  return (
    <div component="DeveloperPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Developer"
          subtitle="Release version and environment variables for API, web, and dashboard deployments."
        />

        {info && info.requiredMissingCount > 0 ? (
          <Alert
            type="error"
            showIcon
            message={`${info.requiredMissingCount} required API environment variable${
              info.requiredMissingCount === 1 ? '' : 's'
            } missing`}
            description={<span>{missingRequired.map((row) => row.key).join(', ')}</span>}
          />
        ) : info ? (
          <Alert
            type="success"
            showIcon
            message="All required API environment variables are set"
            description={
              info.missingCount > 0
                ? `${info.missingCount} recommended API variable${
                    info.missingCount === 1 ? '' : 's'
                  } still unset.`
                : 'Every tracked API variable is configured.'
            }
          />
        ) : null}

        <Card title="Release" loading={loading}>
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Package version">
              <Text strong>{info?.version ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Node environment">
              <Tag>{info?.nodeEnv ?? '—'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="Environment variables"
          extra={
            info ? (
              <Text type="secondary">
                {info.missingCount} API unset · {info.requiredMissingCount} API required missing
              </Text>
            ) : null
          }
        >
          <Paragraph type="secondary" style={{ marginTop: 0 }}>
            Values are loaded from each app&apos;s <Text code>.env</Text> file on the API host.
            API values reflect the live server process; web and dashboard values come from{' '}
            <Text code>apps/web/.env.local</Text> and{' '}
            <Text code>apps/dashboard/.env.local</Text> when present.
          </Paragraph>
          <Space wrap style={{ marginBottom: spacing.md }}>
            <Select
              allowClear
              placeholder="Requirement"
              style={{ width: 160 }}
              value={requirement}
              onChange={setRequirement}
              options={REQUIREMENT_OPTIONS}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 140 }}
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Group"
              style={{ width: 180 }}
              value={group}
              onChange={setGroup}
              options={groupOptions}
            />
          </Space>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as EnvAppFilter)}
            items={[
              {
                key: 'all',
                label: `All (${tabCounts.all})`,
                children: (
                  <EnvVarTabPanel
                    loading={loading}
                    rows={filteredRows}
                    totalRows={applicableRows.length}
                    showAppColumn={true}
                    hasFilters={hasFilters}
                  />
                ),
              },
              {
                key: 'api',
                label: `API (${tabCounts.api})`,
                children: (
                  <EnvVarTabPanel
                    loading={loading}
                    rows={filteredRows.filter((row) => row.app === 'api')}
                    totalRows={applicableRows.filter((row) => row.app === 'api').length}
                    showAppColumn={false}
                    hasFilters={hasFilters}
                  />
                ),
              },
              {
                key: 'web',
                label: `WEB (${tabCounts.web})`,
                children: (
                  <EnvVarTabPanel
                    loading={loading}
                    rows={filteredRows.filter((row) => row.app === 'web')}
                    totalRows={applicableRows.filter((row) => row.app === 'web').length}
                    showAppColumn={false}
                    hasFilters={hasFilters}
                  />
                ),
              },
              {
                key: 'dashboard',
                label: `Dashboard (${tabCounts.dashboard})`,
                children: (
                  <EnvVarTabPanel
                    loading={loading}
                    rows={filteredRows.filter((row) => row.app === 'dashboard')}
                    totalRows={applicableRows.filter((row) => row.app === 'dashboard').length}
                    showAppColumn={false}
                    hasFilters={hasFilters}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}

export default function DeveloperPage() {
  return (
    <div component="DeveloperPage" style={{ display: 'contents' }}>
      <Suspense fallback={null}>
        <DeveloperPageContent />
      </Suspense>
    </div>
  );
}
