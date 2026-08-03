import type { ReactNode } from 'react';

type StickyFiltersSidebarProps = {
  children: ReactNode;
};

export function StickyFiltersSidebar({ children }: StickyFiltersSidebarProps) {
  return (
    <div className="rt-filters-desktop-wrap">
      <div className="rt-filters-desktop">{children}</div>
    </div>
  );
}
