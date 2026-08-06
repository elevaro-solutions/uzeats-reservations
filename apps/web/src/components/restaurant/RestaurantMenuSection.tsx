'use client';

import { useState } from 'react';
import { Tag, Typography } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
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

export function RestaurantMenuSection({ sections, menuUrl, website }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasMenu = sections.length > 0;
  const externalMenuUrl = menuUrl || null;
  const fallbackWebsiteUrl = !externalMenuUrl && website ? website : null;

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
  const showPreview = !expanded && !externalMenuUrl && totalItems > PREVIEW_ITEMS;
  let shown = 0;

  return (
    <section id="menu" className="rt-restaurant-section">
      <div className="rt-restaurant-section__header">
        <Title level={3} className="rt-restaurant-section__title">
          <UnorderedListOutlined style={{ marginRight: 8, color: colors.brand[600] }} />
          Menu
        </Title>
        {externalMenuUrl ? (
          <ExternalMenuLink href={externalMenuUrl} className="rt-restaurant-link">
            View full menu
          </ExternalMenuLink>
        ) : (
          !expanded &&
          totalItems > PREVIEW_ITEMS && (
            <button type="button" className="rt-restaurant-link" onClick={() => setExpanded(true)}>
              View full menu
            </button>
          )
        )}
      </div>

      <div className="rt-restaurant-menu">
        {sections.map((section) => {
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
                          <Tag key={d} className="rt-restaurant-tag rt-restaurant-tag--small">
                            {d}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
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

      {!externalMenuUrl && expanded && totalItems > PREVIEW_ITEMS && (
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
