'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

type StickyFiltersSidebarProps = {
  children: ReactNode;
  boundaryRef?: RefObject<HTMLElement | null>;
};

export function StickyFiltersSidebar({ children, boundaryRef }: StickyFiltersSidebarProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [geometry, setGeometry] = useState({
    top: 0,
    left: 0,
    width: 220,
    height: 0,
    maxHeight: 0,
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const headerOffset =
      Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
        10,
      ) || 64;

    const sync = () => {
      const panel = panelRef.current;
      const boundary = boundaryRef?.current;
      const anchorTop = anchor.getBoundingClientRect().top;
      const boundaryBottom = boundary?.getBoundingClientRect().bottom ?? window.innerHeight;
      const stickyTop = 0;
      const availableHeight = Math.max(0, boundaryBottom - headerOffset);
      const shouldPin = anchorTop <= headerOffset && availableHeight > 80;

      if (shouldPin && panel) {
        const rect = panel.getBoundingClientRect();
        const naturalHeight = panel.offsetHeight;
        const clampedHeight = naturalHeight

        setGeometry({
          top: stickyTop,
          left: rect.left,
          width: panel.offsetWidth,
          height: clampedHeight,
          maxHeight: availableHeight,
        });
      }

      setPinned(shouldPin);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [boundaryRef]);

  return (
    <div className="rt-filters-desktop-wrap">
      <div ref={anchorRef} className="rt-filters-desktop-anchor" aria-hidden />
      <div
        className="rt-filters-desktop-spacer"
        style={{
          width: pinned ? geometry.width : undefined,
          height: pinned ? geometry.height : 0,
        }}
        aria-hidden
      />
      <div
        ref={panelRef}
        className={`rt-filters-desktop${pinned ? ' is-pinned' : ''}`}
        style={
          pinned
            ? {
                top: geometry.top,
                left: geometry.left,
                width: geometry.width,
                height: geometry.height,
                maxHeight: geometry.maxHeight,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
