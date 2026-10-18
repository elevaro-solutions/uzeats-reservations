'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Spin, Typography, message } from 'antd';
import { useQuery } from '@/lib/apollo-hooks';
import { APP_RELEASE_NOTES } from '@/lib/graphql';

const PAGE_SIZE = 8;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Added', label: 'New' },
  { id: 'Changed', label: 'Update' },
  { id: 'Fixed', label: 'Fix' },
  { id: 'Removed', label: 'Removed' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const SECTION_LABEL: Record<string, string> = {
  Added: 'New',
  Changed: 'Update',
  Fixed: 'Fix',
  Removed: 'Removed',
};

const SECTION_ORDER = ['Added', 'Changed', 'Fixed', 'Removed'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ReleaseChange = { section: string; text: string };
type ReleaseEntry = { version: string; date: string; changes: ReleaseChange[] };

function formatReleaseDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return '';
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function releaseId(version: string) {
  return version === 'Unreleased' ? 'unreleased' : `v${version}`;
}

function releaseTitle(version: string) {
  return version === 'Unreleased' ? 'In progress' : `Version ${version}`;
}

function sectionsIn(changes: ReleaseChange[]) {
  const present = new Set(changes.map((change) => change.section));
  return SECTION_ORDER.filter((section) => present.has(section));
}

export default function ReleaseNotesPage() {
  const { data, loading, error } = useQuery(APP_RELEASE_NOTES);
  const notes = data?.appReleaseNotes as { version: string; releases: ReleaseEntry[] } | undefined;
  const releases = notes?.releases ?? [];
  const [filter, setFilter] = useState<FilterId>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (filter === 'all') return releases;
    return releases
      .map((entry) => ({
        ...entry,
        changes: entry.changes.filter((change) => change.section === filter),
      }))
      .filter((entry) => entry.changes.length > 0);
  }, [releases, filter]);

  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const index = filtered.findIndex((entry) => releaseId(entry.version) === id);
    if (index >= PAGE_SIZE) setVisibleCount(index + 1);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filtered]);

  const copyLink = async (version: string) => {
    const url = `${window.location.origin}/release-notes#${releaseId(version)}`;
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied');
    } catch {
      message.error('Could not copy the link');
    }
  };

  return (
    <div component="ReleaseNotesPage" className="rt-release-notes">
      <header className="rt-release-notes__intro">
        <h1 className="rt-release-notes__title">Release notes</h1>
        <p className="rt-release-notes__lede">
          {notes?.version
            ? `Features and fixes for partners and admins, through v${notes.version}.`
            : 'Features and fixes for partners and admins.'}
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
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'release' : 'releases'}`}
        </p>
      </div>

      {loading ? (
        <div className="rt-release-notes__status">
          <Spin />
        </div>
      ) : error ? (
        <Typography.Text type="secondary">Release notes could not be loaded.</Typography.Text>
      ) : filtered.length === 0 ? (
        <Typography.Text type="secondary">No releases match that filter.</Typography.Text>
      ) : (
        <div className="rt-release-notes__list">
          {visible.map((entry) => (
            <article
              key={entry.version}
              id={releaseId(entry.version)}
              className="rt-release-notes__entry"
            >
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
                {entry.changes.map((change) => (
                  <li key={`${change.section}-${change.text}`}>{change.text}</li>
                ))}
              </ul>
              <button
                type="button"
                className="rt-release-notes__copy"
                onClick={() => void copyLink(entry.version)}
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
