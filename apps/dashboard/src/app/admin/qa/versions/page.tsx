'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spin, Typography, message } from 'antd';
import { useQuery } from '@/lib/apollo-hooks';
import { QA_CHECKLIST } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

const PAGE_SIZE = 8;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Added', label: 'New' },
  { id: 'Changed', label: 'Update' },
  { id: 'Fixed', label: 'Fix' },
  { id: 'Removed', label: 'Removed' },
  { id: 'Docs', label: 'Docs' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const SECTION_LABEL: Record<string, string> = {
  Added: 'New',
  Changed: 'Update',
  Fixed: 'Fix',
  Removed: 'Removed',
  Docs: 'Docs',
};

const SECTION_ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Docs'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ReleaseChange = { section: string; text: string };
type ReleaseEntry = { version: string; date: string; changes: ReleaseChange[] };

function formatReleaseDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function releaseTitle(version: string) {
  return version === 'Unreleased' ? 'In progress' : `Version ${version}`;
}

function releaseAnchor(version: string, duplicate: number) {
  const base = version === 'Unreleased' ? 'unreleased' : `v${version.replace(/\./g, '-')}`;
  return duplicate === 0 ? base : `${base}-${duplicate + 1}`;
}

function sectionsIn(changes: ReleaseChange[]) {
  const present = new Set(changes.map((change) => change.section));
  const known = SECTION_ORDER.filter((section) => present.has(section));
  const extra = [...present].filter((section) => !SECTION_ORDER.includes(section));
  return [...known, ...extra];
}

export default function AdminQaVersionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));
  const { data, loading, error } = useQuery(QA_CHECKLIST, { skip: !allowed });
  const releases = (data?.qaChecklist?.history ?? []) as ReleaseEntry[];
  const [filter, setFilter] = useState<FilterId>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const anchored = useMemo(() => {
    const seen = new Map<string, number>();
    return releases.map((entry) => {
      const duplicate = seen.get(entry.version) ?? 0;
      seen.set(entry.version, duplicate + 1);
      return { ...entry, anchor: releaseAnchor(entry.version, duplicate) };
    });
  }, [releases]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  const filtered = useMemo(() => {
    if (filter === 'all') return anchored;
    return anchored
      .map((entry) => ({
        ...entry,
        changes: entry.changes.filter((change) => change.section === filter),
      }))
      .filter((entry) => entry.changes.length > 0);
  }, [anchored, filter]);

  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const index = filtered.findIndex((entry) => entry.anchor === id);
    if (index >= PAGE_SIZE) setVisibleCount(index + 1);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filtered]);

  const copyLink = async (anchor: string) => {
    const url = `${window.location.origin}/admin/qa/versions#${anchor}`;
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied');
    } catch {
      message.error('Could not copy the link');
    }
  };

  if (!allowed) return null;

  return (
    <div className="rt-release-notes">
      <header className="rt-release-notes__intro">
        <h1 className="rt-release-notes__title">Release notes</h1>
        <p className="rt-release-notes__lede">
          Every shipped change, newest first. The checklist keeps only the latest version.
        </p>
      </header>

      <div className="rt-release-notes__toolbar">
        <div className="rt-release-notes__filters" role="group" aria-label="Filter">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                filter === item.id
                  ? 'rt-release-notes__filter rt-release-notes__filter--on'
                  : 'rt-release-notes__filter'
              }
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="rt-release-notes__count">
          {loading ? 'Loading…' : `Showing ${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`}
        </p>
      </div>

      {loading && releases.length === 0 ? (
        <div className="rt-release-notes__status">
          <Spin />
        </div>
      ) : error ? (
        <Typography.Text type="secondary">Versions could not be loaded.</Typography.Text>
      ) : filtered.length === 0 ? (
        <Typography.Text type="secondary">No releases match that filter.</Typography.Text>
      ) : (
        <div className="rt-release-notes__list">
          {visible.map((entry) => (
            <article key={entry.anchor} id={entry.anchor} className="rt-release-notes__entry">
              <p className="rt-release-notes__date">
                {entry.version === 'Unreleased' ? 'Not shipped yet' : formatReleaseDate(entry.date)}
              </p>
              <h2 className="rt-release-notes__heading">{releaseTitle(entry.version)}</h2>
              <div className="rt-release-notes__tags">
                {sectionsIn(entry.changes).map((section) => (
                  <span
                    key={section}
                    className={`rt-release-notes__tag rt-release-notes__tag--${section.toLowerCase()}`}
                  >
                    {SECTION_LABEL[section] ?? section}
                  </span>
                ))}
              </div>
              <ul className="rt-release-notes__items">
                {entry.changes.map((change, changeIndex) => (
                  <li key={`${change.section}-${changeIndex}`}>{change.text}</li>
                ))}
              </ul>
              <button
                type="button"
                className="rt-release-notes__copy"
                onClick={() => void copyLink(entry.anchor)}
              >
                Copy link
              </button>
            </article>
          ))}
        </div>
      )}

      {visible.length < filtered.length ? (
        <div className="rt-release-notes__more">
          <Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load more</Button>
        </div>
      ) : null}
    </div>
  );
}
