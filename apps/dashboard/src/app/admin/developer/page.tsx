'use client';

import { Suspense, useMemo } from 'react';
import { useQuery } from '@/lib/apollo-hooks';
import { Alert, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { DEVELOPER_INFO } from '@/lib/graphql';
import { useRequireSuperAdmin } from '@/lib/useRequireSuperAdmin';

const { Text, Paragraph } = Typography;

type EnvVarRow = {
  key: string;
  label: string;
  group: string;
  groupLabel: string;
  requirement: string;
  description?: string | null;
  configured: boolean;
  applicable: boolean;
  missing: boolean;
};

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

function DeveloperPageContent() {
  const { ready } = useRequireSuperAdmin();

  const { data, loading } = useQuery(DEVELOPER_INFO, {
    skip: !ready,
    fetchPolicy: 'network-only',
  });

  const info = data?.developerInfo;
  const envVars: EnvVarRow[] = info?.envVars ?? [];

  const missingRequired = useMemo(
    () => envVars.filter((row) => row.missing),
    [envVars],
  );

  const tableData = useMemo(
    () => envVars.filter((row) => row.applicable),
    [envVars],
  );

  if (!ready) return null;

  return (
    <div component="DeveloperPageContent" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Developer"
          subtitle="Release version and environment variable health for this deployment."
        />

        {info && info.requiredMissingCount > 0 ? (
          <Alert
            type="error"
            showIcon
            message={`${info.requiredMissingCount} required environment variable${
              info.requiredMissingCount === 1 ? '' : 's'
            } missing`}
            description={
              <span>
                {missingRequired.map((row) => row.key).join(', ')}
              </span>
            }
          />
        ) : info ? (
          <Alert
            type="success"
            showIcon
            message="All required environment variables are set"
            description={
              info.missingCount > 0
                ? `${info.missingCount} recommended variable${
                    info.missingCount === 1 ? '' : 's'
                  } still unset.`
                : 'Every tracked variable is configured.'
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
                {info.missingCount} unset · {info.requiredMissingCount} required missing
              </Text>
            ) : null
          }
        >
          <Paragraph type="secondary" style={{ marginTop: 0 }}>
            Values are never shown — only whether each variable is present in the server
            environment (from <Text code>.env</Text>).
          </Paragraph>
          <Table
            loading={loading}
            rowKey="key"
            dataSource={tableData}
            pagination={false}
            size="middle"
            columns={[
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
