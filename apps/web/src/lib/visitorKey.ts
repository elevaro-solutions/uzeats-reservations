const VISITOR_KEY_STORAGE = 'tv_visitor_key';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Stable per-browser id for guest review reactions (no login required). */
export function getVisitorKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE)?.trim() ?? '';
    if (existing && isUuid(existing)) return existing.toLowerCase();
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4xxx-yxxx-xxxxxxxxxxxx`.replace(
            /[xy]/g,
            (ch) => {
              const n = (Math.random() * 16) | 0;
              const v = ch === 'x' ? n : (n & 0x3) | 0x8;
              return v.toString(16);
            },
          );
    window.localStorage.setItem(VISITOR_KEY_STORAGE, created);
    return created.toLowerCase();
  } catch {
    return '';
  }
}
