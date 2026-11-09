'use client';

import { useCallback, useEffect, useState } from 'react';

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
 *
 * `scrollRef` is a callback ref: portal content (e.g. antd Modal) can mount after
 * the owner's effects run, so a plain ref object would still be null there.
 */
export function useScrollReachedEnd(deps: unknown[] = []) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    setEl(node);
  }, []);

  const check = useCallback(() => {
    if (!el) return;
    if (contentFitsWithoutScroll(el) || isAtBottom(el)) {
      setReachedEnd(true);
    }
  }, [el]);

  const scrollToEnd = useCallback(() => {
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    window.setTimeout(check, 350);
  }, [el, check]);

  useEffect(() => {
    setReachedEnd(false);
    if (!el) return;

    check();
    // Images / late HTML layout can change scrollHeight after paint.
    const raf = requestAnimationFrame(check);
    const t = window.setTimeout(check, 100);

    el.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      el.removeEventListener('scroll', check);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls reset via deps
  }, [el, check, ...deps]);

  return { scrollRef, reachedEnd, scrollToEnd };
}
