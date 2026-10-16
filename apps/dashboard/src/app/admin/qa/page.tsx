'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import { Alert, Button, Checkbox, Input, Space, Tag, Typography, message } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { QA_CHECKLIST, SAVE_QA_CHECKLIST } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

type QaItem = {
  id: string;
  gate: string;
  group: string;
  label: string;
  checked: boolean;
};

type QaChecklist = {
  release: string;
  envNote: string;
  p0Clear: boolean;
  notes: string;
  status: string;
  signedOffName: string;
  signedOffRole: string;
  signedAt: string | null;
  updatedAt: string | null;
  requiredDone: boolean;
  items: QaItem[];
};

export default function AdminQaChecklistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const { data, loading } = useQuery(QA_CHECKLIST, { skip: !allowed });
  const [save, { loading: saving }] = useMutation(SAVE_QA_CHECKLIST);
  const checklist = data?.qaChecklist as QaChecklist | undefined;
  const [envNote, setEnvNote] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!checklist) return;
    setEnvNote(checklist.envNote ?? '');
    setNotes(checklist.notes ?? '');
  }, [checklist?.release, checklist?.updatedAt]);

  const groups = useMemo(() => {
    const map = new Map<string, QaItem[]>();
    for (const item of checklist?.items ?? []) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [checklist]);

  const signed = checklist?.status === 'signed';
  const requiredTotal = (checklist?.items ?? []).filter((item) => item.gate === 'required').length;
  const requiredChecked = (checklist?.items ?? []).filter(
    (item) => item.gate === 'required' && item.checked,
  ).length;

  const persist = async (input: Record<string, unknown>) => {
    try {
      await save({
        variables: { input },
        refetchQueries: [{ query: QA_CHECKLIST }],
        awaitRefetchQueries: true,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save the checklist');
    }
  };

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title={`QA checklist${checklist ? ` · v${checklist.release}` : ''}`}
        subtitle="Saved in the database. Only Super Admin and QA can view or change it."
      />
      {signed ? (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`Signed off by ${checklist?.signedOffName || 'QA'}${
            checklist?.signedOffRole ? ` (${checklist.signedOffRole})` : ''
          }${checklist?.signedAt ? ` on ${checklist.signedAt.slice(0, 10)}` : ''}`}
          action={
            <Button size="small" onClick={() => persist({ reopen: true })} loading={saving}>
              Reopen
            </Button>
          }
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: spacing.lg }}
          message={`Active — ${requiredChecked}/${requiredTotal} required items checked`}
          description="Sign-off stays blocked until every required item is checked and open P0 bugs are confirmed at zero."
        />
      )}

      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: spacing.lg }}>
        <div>
          <Typography.Text type="secondary">Environment / build</Typography.Text>
          <Input
            value={envNote}
            disabled={signed}
            onChange={(e) => setEnvNote(e.target.value)}
            onBlur={() => {
              if (envNote !== (checklist?.envNote ?? '')) persist({ envNote });
            }}
            placeholder="Staging URL and commit"
          />
        </div>
        <Checkbox
          checked={Boolean(checklist?.p0Clear)}
          disabled={signed || saving}
          onChange={(e) => persist({ p0Clear: e.target.checked })}
        >
          Open P0 bug count is 0
        </Checkbox>
      </Space>

      {loading && !checklist ? <Typography.Text>Loading checklist…</Typography.Text> : null}

      {groups.map(([group, items]) => (
        <div key={group} style={{ marginBottom: spacing.lg }}>
          <Typography.Title level={5}>{group}</Typography.Title>
          <Space direction="vertical" size="small">
            {items.map((item) => (
              <div key={item.id}>
                <Checkbox
                  checked={item.checked}
                  disabled={signed || saving}
                  onChange={(e) =>
                    persist({ checks: [{ itemId: item.id, checked: e.target.checked }] })
                  }
                >
                  {item.label}{' '}
                  <Tag color={item.gate === 'required' ? 'gold' : 'blue'}>{item.gate}</Tag>
                </Checkbox>
              </div>
            ))}
          </Space>
        </div>
      ))}

      <Typography.Text type="secondary">Notes / waivers</Typography.Text>
      <Input.TextArea
        rows={3}
        value={notes}
        disabled={signed}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (notes !== (checklist?.notes ?? '')) persist({ notes });
        }}
        style={{ marginTop: 8, marginBottom: spacing.md }}
      />
      <Button
        type="primary"
        disabled={signed || !checklist?.requiredDone || !checklist?.p0Clear}
        loading={saving}
        onClick={() => persist({ signOff: true, notes, envNote })}
      >
        Sign off release
      </Button>
    </div>
  );
}
