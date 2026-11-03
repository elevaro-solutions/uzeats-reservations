'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader, colors, spacing } from '@reservations/ui';
import { useLazyQuery, useQuery } from '@/lib/apollo-hooks';
import { QA_CHECKLIST, QA_CHECKLIST_RUNS } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

type FilterId = 'all' | 'active' | 'signed';

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
  createdAt: string | null;
  requiredTotal: number;
  requiredChecked: number;
  recommendedTotal: number;
  recommendedChecked: number;
  itemTotal: number;
  itemChecked: number;
  requiredDone: boolean;
  isCurrent: boolean;
};

type ChecklistItem = {
  id: string;
  gate: string;
  group: string;
  label: string;
  checked: boolean;
  note: string;
  checkedAt: string | null;
};

function whenLabel(iso: string | null) {
  if (!iso) return '—';
  return dayjs(iso).format('MMM D, YYYY · h:mm A');
}

function pct(checked: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((checked / total) * 100);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function checklistHref(run: Pick<RunSummary, 'release' | 'isCurrent'>) {
  return run.isCurrent ? '/admin/qa' : `/admin/qa?release=${encodeURIComponent(run.release)}`;
}

function RunDetailPanel({ run }: { run: RunSummary }) {
  const [load, { data, loading, error }] = useLazyQuery(QA_CHECKLIST);
  const checklist = data?.qaChecklist as
    | {
        envNote: string;
        notes: string;
        items: ChecklistItem[];
        signedOffName: string;
        signedOffRole: string;
        signedAt: string | null;
        status: string;
        p0Clear: boolean;
      }
    | undefined;

  useEffect(() => {
    void load({ variables: { release: run.release } });
  }, [load, run.release]);

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of checklist?.items ?? []) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [checklist?.items]);

  const openRequired = (checklist?.items ?? []).filter(
    (item) => item.gate === 'required' && !item.checked,
  ).length;
  const notedCount = (checklist?.items ?? []).filter((item) => Boolean(stripHtml(item.note))).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Space wrap size={8}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              v{run.release}
            </Typography.Title>
            {run.isCurrent ? <Tag color="blue">Current gate</Tag> : null}
            <Tag color={run.status === 'signed' ? 'green' : 'gold'}>
              {run.status === 'signed' ? 'Signed off' : 'In progress'}
            </Tag>
            {run.p0Clear ? <Tag color="green">P0 clear</Tag> : <Tag color="orange">P0 open</Tag>}
          </Space>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
            {run.status === 'signed'
              ? `Signed by ${run.signedOffName || 'QA'}${
                  run.signedOffRole ? ` (${run.signedOffRole})` : ''
                } · ${whenLabel(run.signedAt)}`
              : `Last updated ${whenLabel(run.updatedAt)}`}
          </Typography.Text>
        </div>
        <Link href={checklistHref(run)}>
          <Button type="primary">{run.isCurrent ? 'Open checklist' : 'Continue this release'}</Button>
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: spacing.sm,
        }}
      >
        <StatChip
          label="Required"
          value={`${run.requiredChecked}/${run.requiredTotal}`}
          percent={pct(run.requiredChecked, run.requiredTotal)}
          tone={run.status === 'signed' ? 'success' : 'active'}
        />
        <StatChip
          label="Recommended"
          value={`${run.recommendedChecked}/${run.recommendedTotal}`}
          percent={pct(run.recommendedChecked, run.recommendedTotal)}
          tone="active"
        />
        <StatChip
          label="Open required"
          value={String(openRequired)}
          hint={openRequired === 0 ? 'Ready to sign' : 'Still blocking'}
        />
        <StatChip label="Item notes" value={String(notedCount)} hint="Tasks with notes" />
      </div>

      {loading && !checklist ? (
        <div style={{ padding: spacing.xl, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : error ? (
        <Typography.Text type="danger">Could not load this release.</Typography.Text>
      ) : checklist ? (
        <>
          <section
            style={{
              border: `1px solid ${colors.neutral[200]}`,
              borderRadius: 12,
              padding: spacing.md,
              background: colors.neutral[50],
            }}
          >
            <Typography.Text type="secondary">Environment / build</Typography.Text>
            <div style={{ marginTop: 4 }}>
              {checklist.envNote?.trim() ? checklist.envNote : 'Not recorded'}
            </div>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: spacing.sm }}>
              Notes / waivers
            </Typography.Text>
            {checklist.notes?.trim() ? (
              <div
                style={{ marginTop: 4 }}
                dangerouslySetInnerHTML={{ __html: checklist.notes }}
              />
            ) : (
              <div style={{ marginTop: 4, color: colors.textSecondary }}>None</div>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {groups.map(([group, items]) => (
              <section key={group}>
                <Typography.Title level={5} style={{ margin: `0 0 ${spacing.sm}px` }}>
                  {group}
                  <Typography.Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                    {items.filter((item) => item.checked).length}/{items.length}
                  </Typography.Text>
                </Typography.Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item) => {
                    const note = stripHtml(item.note);
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: `1px solid ${colors.neutral[200]}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                          background: item.checked ? '#f6ffed' : '#fff',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <Space wrap size={6}>
                              {item.checked ? (
                                <CheckCircleFilled style={{ color: colors.success }} />
                              ) : (
                                <ClockCircleOutlined style={{ color: colors.textSecondary }} />
                              )}
                              <Typography.Text strong>{item.label}</Typography.Text>
                              <Tag color={item.gate === 'required' ? 'gold' : 'blue'}>
                                {item.gate}
                              </Tag>
                            </Space>
                            <Typography.Text
                              type="secondary"
                              style={{ display: 'block', marginTop: 4 }}
                            >
                              {item.checked
                                ? `Completed ${whenLabel(item.checkedAt)}`
                                : 'Not completed'}
                            </Typography.Text>
                          </div>
                        </div>
                        {note ? (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: colors.neutral[50],
                              borderLeft: `3px solid ${colors.brand[400]}`,
                              display: 'flex',
                              gap: 8,
                            }}
                          >
                            <FileTextOutlined style={{ marginTop: 3, color: colors.brand[600] }} />
                            <Typography.Text>{note}</Typography.Text>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatChip({
  label,
  value,
  percent,
  hint,
  tone,
}: {
  label: string;
  value: string;
  percent?: number;
  hint?: string;
  tone?: 'success' | 'active';
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.neutral[200]}`,
        borderRadius: 12,
        padding: '12px 14px',
        background: '#fff',
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
      {typeof percent === 'number' ? (
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          status={tone === 'success' ? 'success' : 'active'}
          style={{ margin: '8px 0 0' }}
        />
      ) : hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </div>
  );
}

export default function AdminQaHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const { data, loading } = useQuery(QA_CHECKLIST_RUNS, { skip: !allowed });
  const runs = (data?.qaChecklistRuns ?? []) as RunSummary[];
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return runs.filter((run) => {
      if (filter === 'active' && run.status !== 'active') return false;
      if (filter === 'signed' && run.status !== 'signed') return false;
      if (!needle) return true;
      const hay = [
        run.release,
        run.envNote,
        run.notes,
        run.signedOffName,
        run.status,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [runs, filter, query]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedRelease(null);
      return;
    }
    if (!selectedRelease || !filtered.some((run) => run.release === selectedRelease)) {
      setSelectedRelease(filtered[0]!.release);
    }
  }, [filtered, selectedRelease]);

  const selected = filtered.find((run) => run.release === selectedRelease) ?? null;
  const activeCount = runs.filter((run) => run.status === 'active').length;
  const signedCount = runs.filter((run) => run.status === 'signed').length;

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="QA task history"
        subtitle="Browse every saved checklist run. Prior releases keep their tasks, notes, progress, and sign-off after a new version deploys."
        extra={
          <Space>
            <Link href="/admin/qa/dashboard">Dashboard</Link>
            <Link href="/admin/qa">Current checklist</Link>
          </Space>
        }
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as FilterId)}
          options={[
            { label: `All (${runs.length})`, value: 'all' },
            { label: `Active (${activeCount})`, value: 'active' },
            { label: `Signed (${signedCount})`, value: 'signed' },
          ]}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search version, notes, or signer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {loading && runs.length === 0 ? (
        <div style={{ padding: spacing.xl, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : runs.length === 0 ? (
        <Empty description="No QA checklist runs saved yet." />
      ) : filtered.length === 0 ? (
        <Empty description="No runs match that filter." />
      ) : (
        <Row gutter={[spacing.md, spacing.md]} align="top">
          <Col xs={24} lg={8} xl={7}>
            <aside
              style={{
                border: `1px solid ${colors.neutral[200]}`,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
                maxHeight: 'calc(100vh - 220px)',
                overflowY: 'auto',
              }}
            >
              {filtered.map((run) => {
                const selectedRow = run.release === selectedRelease;
                const requiredPct = pct(run.requiredChecked, run.requiredTotal);
                return (
                  <button
                    key={run.release}
                    type="button"
                    onClick={() => setSelectedRelease(run.release)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      borderBottom: `1px solid ${colors.neutral[100]}`,
                      borderLeft: selectedRow
                        ? `3px solid ${colors.brand[600]}`
                        : '3px solid transparent',
                      background: selectedRow ? colors.brand[50] : '#fff',
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Typography.Text strong>v{run.release}</Typography.Text>
                      <Space size={4}>
                        {run.isCurrent ? <Tag color="blue">Current</Tag> : null}
                        <Tag color={run.status === 'signed' ? 'green' : 'gold'}>
                          {run.status === 'signed' ? 'Signed' : 'Active'}
                        </Tag>
                      </Space>
                    </div>
                    <Progress
                      percent={requiredPct}
                      size="small"
                      status={run.status === 'signed' ? 'success' : 'active'}
                      format={() => `${run.requiredChecked}/${run.requiredTotal}`}
                      style={{ margin: '10px 0 6px' }}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {run.status === 'signed'
                        ? `${run.signedOffName || 'QA'} · ${whenLabel(run.signedAt)}`
                        : `Updated ${whenLabel(run.updatedAt)}`}
                    </Typography.Text>
                    {stripHtml(run.notes) ? (
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ margin: '8px 0 0', fontSize: 12 }}
                      >
                        {stripHtml(run.notes)}
                      </Typography.Paragraph>
                    ) : null}
                  </button>
                );
              })}
            </aside>
          </Col>

          <Col xs={24} lg={16} xl={17}>
            <main
              style={{
                border: `1px solid ${colors.neutral[200]}`,
                borderRadius: 12,
                padding: spacing.lg,
                background: '#fff',
                minHeight: 420,
                maxHeight: 'calc(100vh - 220px)',
                overflowY: 'auto',
              }}
            >
              {selected ? <RunDetailPanel run={selected} /> : null}
            </main>
          </Col>
        </Row>
      )}
    </div>
  );
}
