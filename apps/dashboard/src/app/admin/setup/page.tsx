'use client';

import { Button, Card, Progress, Space, Typography } from 'antd';
import { PageHeader, colors, radii, spacing } from '@reservations/ui';
import { SetupChecklist } from '@/components/SetupGuide';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useSetupGuide } from '@/lib/useSetupGuide';

const { Text } = Typography;

export default function AdminSetupPage() {
  const { ready, user } = useRequireAdmin();
  const { guide, progress, local } = useSetupGuide({
    user: ready ? user : null,
    isAdmin: ready,
    restaurant: undefined,
  });

  if (!ready) return null;

  return (
    <div component="AdminSetupPage" style={{ display: 'contents' }}>
      <Space orientation="vertical" size={spacing.lg} style={{ width: '100%' }}>
        <PageHeader
          title="Platform setup"
          subtitle="Everything the platform needs before restaurants and diners can rely on it"
          extra={
            guide && local.state.hidden ? (
              <Button onClick={() => local.setHidden(false)}>Show setup guide</Button>
            ) : undefined
          }
        />
        {!guide ? (
          <Card className="rt-surface-card" style={{ borderRadius: radii.lg }}>
            <Text type="secondary">
              Platform setup is managed by admins and super admins. Ask one of them to finish the
              remaining steps.
            </Text>
          </Card>
        ) : (
          <>
            <Card
              className="rt-surface-card"
              style={{ borderRadius: radii.lg }}
              styles={{ body: { padding: spacing.lg } }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {progress.completed} of {progress.total} steps complete
                {progress.allRequiredComplete ? ' · all required steps done' : ''}
              </Text>
              <Progress percent={progress.percent} strokeColor={colors.brand[600]} />
            </Card>
            <SetupChecklist guide={guide} local={local} />
          </>
        )}
      </Space>
    </div>
  );
}
