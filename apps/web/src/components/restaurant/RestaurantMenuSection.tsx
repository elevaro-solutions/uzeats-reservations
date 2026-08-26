'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Typography } from 'antd';
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { colors } from '@reservations/ui';

const { Title, Text } = Typography;

type MenuItem = {
  id?: string;
  name: string;
  description?: string | null;
  priceCents: number;
  dietary?: string[];
  photoUrl?: string | null;
};

type MenuSection = {
  id: string;
  name: string;
  items: MenuItem[];
};

type Props = {
  sections: MenuSection[];
  menuUrl?: string | null;
  website?: string | null;
};

const PREVIEW_ITEMS = 4;
/** Show in-menu search once the list is large enough to browse. */
const SEARCH_MIN_ITEMS = 6;

function ExternalMenuLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function itemMatchesQuery(item: MenuItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.name} ${item.description ?? ''} ${(item.dietary ?? []).join(' ')}`.toLowerCase();
  return haystack.includes(query);
}

export function RestaurantMenuSection({ sections, menuUrl, website }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasMenu = sections.length > 0;
  const externalMenuUrl = menuUrl || null;
  const fallbackWebsiteUrl = !externalMenuUrl && website ? website : null;

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  if (!hasMenu) {
    return (
      <section id="menu" className="rt-restaurant-section">
        <Title level={3} className="rt-restaurant-section__title">
          Menu
        </Title>
        <Text type="secondary">Menu coming soon.</Text>
        {(externalMenuUrl || fallbackWebsiteUrl) && (
          <div style={{ marginTop: 12 }}>
            <ExternalMenuLink
              href={externalMenuUrl ?? fallbackWebsiteUrl!}
              className="rt-restaurant-link"
            >
              View full menu →
            </ExternalMenuLink>
          </div>
        )}
      </section>
    );
  }

  const totalItems = sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
  const canSearch = totalItems >= SEARCH_MIN_ITEMS;
  const isSearching = deferredQuery.length > 0;
  const showPreview = !expanded && !externalMenuUrl && !isSearching && totalItems > PREVIEW_ITEMS;

  const filteredSections = isSearching
    ? sections
        .map((section) => ({
          ...section,
          items: (section.items ?? []).filter((item) => itemMatchesQuery(item, deferredQuery)),
        }))
        .filter((section) => section.items.length > 0)
    : sections;

  const matchCount = filteredSections.reduce((n, s) => n + s.items.length, 0);
  let shown = 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <section id="menu" className="rt-restaurant-section">
      <div className="rt-restaurant-section__header">
        <Title level={3} className="rt-restaurant-section__title">
          <UnorderedListOutlined style={{ marginRight: 8, color: colors.brand[600] }} />
          Menu
        </Title>
        <div className="rt-restaurant-section__header-actions">
          {canSearch && (
            <button
              type="button"
              className={`rt-restaurant-menu__search-toggle${searchOpen ? ' is-active' : ''}`}
              aria-label={searchOpen ? 'Close menu search' : 'Search menu'}
              aria-expanded={searchOpen}
              aria-controls="restaurant-menu-search"
              onClick={() => {
                if (searchOpen) {
                  closeSearch();
                  return;
                }
                setSearchOpen(true);
                if (!externalMenuUrl) setExpanded(true);
              }}
            >
              <SearchOutlined />
            </button>
          )}
          {externalMenuUrl ? (
            <ExternalMenuLink href={externalMenuUrl} className="rt-restaurant-link">
              View full menu
            </ExternalMenuLink>
          ) : (
            !expanded &&
            !isSearching &&
            totalItems > PREVIEW_ITEMS && (
              <button type="button" className="rt-restaurant-link" onClick={() => setExpanded(true)}>
                View full menu
              </button>
            )
          )}
        </div>
      </div>

      {searchOpen && canSearch && (
        <div id="restaurant-menu-search" className="rt-restaurant-menu__search">
          <SearchOutlined className="rt-restaurant-menu__search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            className="rt-restaurant-menu__search-input"
            placeholder="Search dishes…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!externalMenuUrl) setExpanded(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSearch();
            }}
            aria-label="Search menu items"
          />
          {searchQuery && (
            <button
              type="button"
              className="rt-restaurant-menu__search-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="rt-restaurant-menu">
        {isSearching && matchCount === 0 ? (
          <Text type="secondary" className="rt-restaurant-menu__empty">
            No dishes match “{searchQuery.trim()}”.
          </Text>
        ) : (
          filteredSections.map((section) => {
            const items = section.items ?? [];
            const visibleItems = showPreview
              ? items.filter(() => {
                  if (shown >= PREVIEW_ITEMS) return false;
                  shown += 1;
                  return true;
                })
              : items;

            if (showPreview && visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="rt-restaurant-menu__section">
                <Title level={5} className="rt-restaurant-menu__section-title">
                  {section.name}
                  {isSearching && (
                    <Text type="secondary" className="rt-restaurant-menu__section-count">
                      {' '}
                      ({items.length})
                    </Text>
                  )}
                </Title>
                {visibleItems.map((item, idx) => (
                  <div key={item.id ?? idx} className="rt-restaurant-menu__item">
                    {item.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="rt-restaurant-menu__item-photo"
                      />
                    )}
                    <div className="rt-restaurant-menu__item-body">
                      <div className="rt-restaurant-menu__item-header">
                        <Text strong>{item.name}</Text>
                        <Text className="rt-restaurant-menu__price">
                          ${(item.priceCents / 100).toFixed(2)}
                        </Text>
                      </div>
                      {item.description && (
                        <Text type="secondary" className="rt-restaurant-menu__item-desc">
                          {item.description}
                        </Text>
                      )}
                      {(item.dietary?.length ?? 0) > 0 && (
                        <div className="rt-restaurant-menu__dietary">
                          {item.dietary!.map((d) => (
                            <span key={d} className="rt-restaurant-tag rt-restaurant-tag--small">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {externalMenuUrl ? (
        <ExternalMenuLink href={externalMenuUrl} className="rt-restaurant-btn-outline">
          View full menu
        </ExternalMenuLink>
      ) : (
        showPreview && (
          <button type="button" className="rt-restaurant-btn-outline" onClick={() => setExpanded(true)}>
            View full menu ({totalItems} items)
          </button>
        )
      )}

      {!externalMenuUrl && expanded && !isSearching && totalItems > PREVIEW_ITEMS && (
        <button
          type="button"
          className="rt-restaurant-link"
          style={{ marginTop: 16, display: 'inline-block' }}
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}

      {fallbackWebsiteUrl && (
        <div style={{ marginTop: 16 }}>
          <ExternalMenuLink href={fallbackWebsiteUrl} className="rt-restaurant-link">
            View menu on restaurant website →
          </ExternalMenuLink>
        </div>
      )}
    </section>
  );
}
