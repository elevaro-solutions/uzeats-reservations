'use client';

import { useCallback, useState } from 'react';

/**
 * Tracks whether a form (or related controls) has changed since the last
 * load/reset/successful save. Use to disable Save/Submit until there is a change.
 */
export function useFormDirty(initial = false) {
  const [dirty, setDirty] = useState(initial);

  const markDirty = useCallback(() => setDirty(true), []);
  const clearDirty = useCallback(() => setDirty(false), []);
  const onValuesChange = useCallback(() => setDirty(true), []);

  return { dirty, setDirty, markDirty, clearDirty, onValuesChange };
}
