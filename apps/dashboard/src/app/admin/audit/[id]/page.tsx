'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@/lib/apollo-hooks';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import { PageHeader, spacing } from '@reservations/ui';
import { AUDIT_LOG } from '@/lib/graphql';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { auditCopyText, formatAuditDetails } from '../auditCopy';

const { Text, Paragraph } = Typography;

export default function AdminAuditDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const { ready } = useRequireAdmin();

  const { data, loading } = useQuery(AUDIT_LOG, {
    skip: !ready || !id,
    variables: { id },
    fetchPolicy: 'network-only',
  });

  if (!ready) return null;

  const log = data?.auditLog ?? null;

  const copyLog = async () => {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(auditCopyText(log));
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy');
    }
  };

  if (!loading && !log) {
    return (
      <div component="AdminAuditDetailPage" style={{ display: 'contents' }}>
        <Space orientation="vertical" size={spacing.lg}>
          <Link href="/admin/audit">
            <Button icon={<ArrowLeftOutlined />}>Back to audit logs</Button>
          </Link>
          <Empty description="Audit log not found" />
        </Space>
      </div>
    );
  }

  const detailsText = formatAuditDetails(log?.details);
  const actorLabel = log?.actor
    ? `${log.actor.firstName} ${log.actor.lastName}`
    : log?.actorId ?? '—';

  return (
    <div component="AdminAuditDetailPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <div>
          <Link href="/admin/audit">
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0 }}>
              Back to audit logs
            </Button>
          </Link>
          <PageHeader
            title={log?.action ?? 'Audit log'}
            subtitle={
              log
                ? `${log.resource}${log.resourceId ? ` · ${log.resourceId}` : ''} · ${new Date(log.createdAt).toLocaleString()}`
                : 'Loading…'
            }
            extra={
              log ? (
                <Button icon={<CopyOutlined />} onClick={copyLog}>
                  Copy log data
                </Button>
              ) : null
            }
          />
        </div>

        <Card loading={loading}>
          {log && (
            <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
              <Descriptions.Item label="ID" span={2}>
                <Text code copyable>
                  {log.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                {new Date(log.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="IP">{log.ip || '—'}</Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag>{log.action}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Resource">{log.resource}</Descriptions.Item>
              <Descriptions.Item label="Resource ID" span={2}>
                {log.resourceId ? (
                  <Text code copyable>
                    {log.resourceId}
                  </Text>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Actor" span={2}>
                <Space orientation="vertical" size={0}>
                  <span>{actorLabel}</span>
                  {log.actor?.email && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {log.actor.email}
                      {log.actor.role ? ` · ${log.actor.role}` : ''}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }} copyable={{ text: log.actorId }}>
                    {log.actorId}
                  </Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Details" span={2}>
                {detailsText ? (
                  <Paragraph
                    style={{
                      marginBottom: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: 12,
                      maxHeight: 480,
                      overflow: 'auto',
                    }}
                  >
                    {detailsText}
                  </Paragraph>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </Space>
    </div>
  );
}
