'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BOTTOM_TOLERANCE_PX = 24;

function isAtBottom(el: HTMLElement, tolerance = BOTTOM_TOLERANCE_PX) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= tolerance;
}

function contentFitsWithoutScroll(el: HTMLElement) {
  return el.scrollHeight <= el.clientHeight + BOTTOM_TOLERANCE_PX;
}

/**
 * Tracks whether a scrollable element has been scrolled to the bottom.
 * If content does not overflow, `reachedEnd` is true immediately.
 */
export function useScrollReachedEnd(deps: unknown[] = []) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const check = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (contentFitsWithoutScroll(el) || isAtBottom(el)) {
      setReachedEnd(true);
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    // Smooth scroll may finish after a frame; re-check shortly.
    window.setTimeout(check, 350);
  }, [check]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isAtBottom(el)) setReachedEnd(true);
  }, []);

  useEffect(() => {
    setReachedEnd(false);
    const el = scrollRef.current;
    if (!el) return;

    const run = () => check();
    run();
    // Images / late HTML layout can change scrollHeight after paint.
    const raf = requestAnimationFrame(run);
    const t = window.setTimeout(run, 100);

    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
    ro?.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls reset via deps
  }, [check, onScroll, ...deps]);

  return { scrollRef, reachedEnd, scrollToEnd };
}
