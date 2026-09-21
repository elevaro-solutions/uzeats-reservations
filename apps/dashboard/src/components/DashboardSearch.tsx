'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Empty, Input, Modal, Typography } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, ShopOutlined } from '@ant-design/icons';
import { colors, radii, spacing, typography } from '@reservations/ui';
import {
  ADMIN_PAGES,
  PARTNER_PAGES,
  filterPagesForUser,
  matchPages,
  type SearchablePage,
} from '@/lib/dashboardNav';

const { Text } = Typography;

const RECENT_KEY = 'rt-dash-recent-pages';
const MAX_RECENT = 6;

type RestaurantOption = {
  id: string;
  name: string;
  city?: string | null;
};

type DashboardSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  showOnboarding?: boolean;
  isSuperAdmin?: boolean;
  restaurants?: RestaurantOption[];
  onSelectRestaurant?: (id: string) => void;
};

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function pushRecent(href: string) {
  const next = [href, ...loadRecent().filter((h) => h !== href)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function useDashboardSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'k' && e.key !== 'K') return;
      e.preventDefault();
      onOpen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}

export function DashboardSearchTrigger({ onClick }: { onClick: () => void }) {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');

  return (
    <button type="button" className="rt-dash-search-trigger" onClick={onClick} aria-label="Search pages">
      <SearchOutlined className="rt-dash-search-trigger__icon" />
      <span className="rt-dash-search-trigger__label">Search pages</span>
      <kbd className="rt-dash-search-trigger__kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  );
}

export function DashboardSearch({
  open,
  onOpenChange,
  isAdmin,
  showOnboarding = false,
  isSuperAdmin = false,
  restaurants = [],
  onSelectRestaurant,
}: DashboardSearchProps) {
  const router = useRouter();
  const inputRef = useRef<InputRef>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  const catalog = useMemo((): SearchablePage[] => {
    const pages = filterPagesForUser(isAdmin ? ADMIN_PAGES : PARTNER_PAGES, {
      showOnboarding,
      isSuperAdmin,
    }).map((p) => ({ ...p, kind: 'page' as const }));

    if (isAdmin || restaurants.length === 0) return pages;

    const restaurantEntries: SearchablePage[] = restaurants.map((r) => ({
      href: `restaurant:${r.id}`,
      label: r.name,
      group: 'Restaurants',
      audience: 'partner' as const,
      icon: <ShopOutlined />,
      keywords: [r.city ?? '', 'location', 'venue', 'switch'].filter(Boolean),
      kind: 'restaurant' as const,
      description: r.city ? `Switch to ${r.city}` : 'Switch active restaurant',
    }));

    return [...pages, ...restaurantEntries];
  }, [isAdmin, showOnboarding, isSuperAdmin, restaurants]);

  const results = useMemo(() => {
    if (query.trim()) return matchPages(catalog, query);

    const byHref = new Map(catalog.map((p) => [p.href, p]));
    const recent = recentHrefs
      .map((href) => byHref.get(href))
      .filter((p): p is SearchablePage => Boolean(p));
    const recentSet = new Set(recent.map((p) => p.href));
    const rest = catalog.filter((p) => !recentSet.has(p.href));
    return [...recent, ...rest].slice(0, 12);
  }, [catalog, query, recentHrefs]);

  const recentResultCount = useMemo(() => {
    if (query.trim()) return 0;
    const hrefSet = new Set(catalog.map((p) => p.href));
    return recentHrefs.filter((href) => hrefSet.has(href)).length;
  }, [catalog, query, recentHrefs]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setRecentHrefs(loadRecent());
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const select = useCallback(
    (page: SearchablePage) => {
      if (page.kind === 'restaurant') {
        const id = page.href.replace(/^restaurant:/, '');
        onSelectRestaurant?.(id);
        pushRecent(page.href);
        close();
        return;
      }
      pushRecent(page.href);
      close();
      router.push(page.href);
    },
    [close, onSelectRestaurant, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const page = results[activeIndex];
      if (page) select(page);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      closable={false}
      destroyOnHidden
      width={560}
      centered
      className="rt-dash-search-modal"
      styles={{
        container: {
          padding: 0,
          borderRadius: radii.lg,
          overflow: 'hidden',
          background: colors.surface,
        },
        body: { padding: 0 },
      }}
    >
      <div className="rt-dash-search" onKeyDown={onKeyDown}>
        <div className="rt-dash-search__input-wrap">
          <SearchOutlined style={{ color: colors.textSecondary, fontSize: 16 }} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAdmin ? 'Search admin pages…' : 'Search pages and restaurants…'}
            variant="borderless"
            size="large"
            allowClear
            aria-label="Search dashboard pages"
            aria-controls="rt-dash-search-results"
            aria-activedescendant={
              results[activeIndex] ? `rt-dash-search-item-${activeIndex}` : undefined
            }
          />
        </div>

        <div id="rt-dash-search-results" className="rt-dash-search__results" role="listbox">
          {results.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={query.trim() ? 'No matching pages' : 'No pages available'}
              style={{ padding: spacing.lg }}
            />
          ) : (
            results.map((page, index) => {
              const active = index === activeIndex;
              const showRecentHint = !query.trim() && index < recentResultCount;
              return (
                <button
                  key={page.href}
                  id={`rt-dash-search-item-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`rt-dash-search__item${active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(page)}
                >
                  <span className="rt-dash-search__item-icon">{page.icon}</span>
                  <span className="rt-dash-search__item-body">
                    <span className="rt-dash-search__item-label">{page.label}</span>
                    <Text type="secondary" className="rt-dash-search__item-meta">
                      {page.description ?? page.group}
                      {showRecentHint ? ' · Recent' : ''}
                    </Text>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="rt-dash-search__footer">
          <Text type="secondary" style={{ fontSize: typography.fontSize.xs }}>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
          </Text>
        </div>
      </div>
    </Modal>
  );
}
