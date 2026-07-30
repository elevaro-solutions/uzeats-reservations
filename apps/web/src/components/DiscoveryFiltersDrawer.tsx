'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, Drawer } from 'antd';
import { FilterOutlined } from '@ant-design/icons';

const MOBILE_MAX_WIDTH = 960;

export function useIsMobileFilters() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return isMobile;
}

type DiscoveryFiltersDrawerProps = {
  filtersContent: ReactNode;
  activeFilterCount: number;
  onClearAll?: () => void;
};

export function DiscoveryFiltersDrawer({
  filtersContent,
  activeFilterCount,
  onClearAll,
}: DiscoveryFiltersDrawerProps) {
  const isMobile = useIsMobileFilters();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <>
      <button
        type="button"
        className="rt-filters-mobile-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
      >
        <FilterOutlined />
        <span>Filters</span>
        {activeFilterCount > 0 ? (
          <Badge count={activeFilterCount} className="rt-filters-mobile-trigger__badge" />
        ) : null}
      </button>

      <Drawer
        title="Filters"
        placement="bottom"
        height="85vh"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
        className="rt-filters-drawer"
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column' },
          header: { borderBottom: '1px solid var(--color-border-subtle)' },
        }}
        footer={
          <div className="rt-filters-drawer__footer">
            {onClearAll && activeFilterCount > 0 ? (
              <Button type="text" onClick={onClearAll}>
                Clear all
              </Button>
            ) : (
              <span />
            )}
            <Button type="primary" size="large" onClick={() => setOpen(false)} block>
              Show results
            </Button>
          </div>
        }
      >
        {filtersContent}
      </Drawer>
    </>
  );
}
