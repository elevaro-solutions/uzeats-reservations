'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@/lib/apollo-hooks';
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { PageHeader, spacing } from '@reservations/ui';
import { QA_CHECKLIST, SAVE_QA_CHECKLIST } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

type QaItem = {
  id: string;
  gate: string;
  group: string;
  label: string;
  steps: string[];
  checked: boolean;
  note: string;
  checkedAt: string | null;
};

type QaChange = { section: string; text: string };

type QaHistoryEntry = {
  version: string;
  date: string;
  changes: QaChange[];
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
  history: QaHistoryEntry[];
};

function completedLabel(iso: string | null) {
  if (!iso) return 'Not completed';
  return dayjs(iso).format('MMM D, YYYY · h:mm A');
}

function sectionColor(section: string) {
  const key = section.toLowerCase();
  if (key === 'added') return 'green';
  if (key === 'changed') return 'blue';
  if (key === 'fixed') return 'gold';
  if (key === 'removed') return 'red';
  return 'default';
}

function groupChanges(changes: QaChange[]) {
  const groups: { section: string; texts: string[] }[] = [];
  for (const change of changes) {
    const last = groups[groups.length - 1];
    if (last?.section === change.section) last.texts.push(change.text);
    else groups.push({ section: change.section, texts: [change.text] });
  }
  return groups;
}

export default function AdminQaChecklistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const { data, loading } = useQuery(QA_CHECKLIST, { skip: !allowed });
  const [save, { loading: saving }] = useMutation(SAVE_QA_CHECKLIST);
  const checklist = data?.qaChecklist as QaChecklist | undefined;
  const [envNote, setEnvNote] = useState('');
  const [notes, setNotes] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

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

  const openItem = (checklist?.items ?? []).find((item) => item.id === openId) ?? null;

  useEffect(() => {
    setNoteDraft(openItem?.note ?? '');
  }, [openItem?.id, openItem?.note]);

  const groups = useMemo(() => {
    const map = new Map<string, QaItem[]>();
    for (const item of checklist?.items ?? []) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [checklist]);

  const latestRelease = useMemo(() => {
    const entries = checklist?.history ?? [];
    const gated = checklist?.release
      ? entries.find((entry) => entry.version === checklist.release)
      : null;
    return gated ?? entries.find((entry) => entry.version !== 'Unreleased') ?? null;
  }, [checklist?.history, checklist?.release]);

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

  const saveItemNote = () => {
    if (!openItem || signed) return;
    if (noteDraft === (openItem.note ?? '')) return;
    void persist({ checks: [{ itemId: openItem.id, note: noteDraft }] });
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
          title={`Signed off by ${checklist?.signedOffName || 'QA'}${
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
          title={`Active — ${requiredChecked}/${requiredTotal} required items checked`}
          description="Sign-off stays blocked until every required item is checked and open P0 bugs are confirmed at zero."
        />
      )}

      <Space orientation="vertical" size="middle" style={{ width: '100%', marginBottom: spacing.lg }}>
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

      {latestRelease ? (
        <div style={{ marginBottom: spacing.lg }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
            <div>
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {latestRelease.date
                  ? `Latest release · v${latestRelease.version} — ${latestRelease.date}`
                  : `Latest release · v${latestRelease.version}`}
              </Typography.Title>
              <Typography.Text type="secondary">Older releases are on Versions.</Typography.Text>
            </div>
            <Link href="/admin/qa/versions">All versions</Link>
          </Space>
          <Space orientation="vertical" size="small" style={{ width: '100%', marginTop: spacing.sm }}>
            {groupChanges(latestRelease.changes).map((group) => (
              <div key={group.section}>
                <Tag color={sectionColor(group.section)}>{group.section}</Tag>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {group.texts.map((text, textIndex) => (
                    <li key={`${group.section}-${textIndex}`}>{text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Space>
        </div>
      ) : null}

      {loading && !checklist ? <Typography.Text>Loading checklist…</Typography.Text> : null}

      {groups.map(([group, items]) => (
        <div key={group} style={{ marginBottom: spacing.lg }}>
          <Typography.Title level={5}>{group}</Typography.Title>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-start' }}>
                <Checkbox
                  checked={item.checked}
                  disabled={signed || saving}
                  style={{ marginTop: 2 }}
                  onChange={(e) =>
                    persist({ checks: [{ itemId: item.id, checked: e.target.checked }] })
                  }
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(item.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      margin: 0,
                      padding: 0,
                      border: 0,
                      background: 'transparent',
                      color: 'inherit',
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      {item.label}{' '}
                      <Tag color={item.gate === 'required' ? 'gold' : 'blue'}>{item.gate}</Tag>
                    </span>
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                      {item.checked ? `Completed ${completedLabel(item.checkedAt)}` : 'Not completed'}
                      {item.note ? ' · Note added' : ''}
                    </Typography.Text>
                  </button>
                </div>
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

      <Drawer
        title="Steps and instructions"
        placement="right"
        width={440}
        open={Boolean(openItem)}
        onClose={() => {
          saveItemNote();
          setOpenId(null);
        }}
        extra={
          openItem ? (
            <Tag color={openItem.gate === 'required' ? 'gold' : 'blue'}>{openItem.gate}</Tag>
          ) : null
        }
      >
        {openItem ? (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {openItem.label}
            </Typography.Title>
            <Checkbox
              checked={openItem.checked}
              disabled={signed || saving}
              onChange={(e) =>
                persist({ checks: [{ itemId: openItem.id, checked: e.target.checked }] })
              }
            >
              {openItem.checked ? 'Completed' : 'Mark completed'}
            </Checkbox>
            <div>
              <Typography.Text type="secondary">When completed</Typography.Text>
              <div>{openItem.checked ? completedLabel(openItem.checkedAt) : 'Not completed'}</div>
            </div>
            <div>
              <Typography.Text strong>Steps</Typography.Text>
              <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {openItem.steps.map((step, index) => (
                  <li key={step} style={{ marginBottom: index === openItem.steps.length - 1 ? 0 : 8 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <Typography.Text type="secondary">Optional note</Typography.Text>
              <Input.TextArea
                rows={4}
                value={noteDraft}
                disabled={signed || saving}
                placeholder="Waiver, bug id, or what you saw. Leave blank if you have nothing to add."
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={saveItemNote}
                style={{ marginTop: 8 }}
              />
              <Button
                style={{ marginTop: spacing.sm }}
                disabled={signed || saving || noteDraft === (openItem.note ?? '')}
                loading={saving}
                onClick={saveItemNote}
              >
                Save note
              </Button>
            </div>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
