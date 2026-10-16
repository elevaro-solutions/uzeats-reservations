import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NO_SHOW_MARKING_MODE,
  isNoShowMarkingMode,
  resolveNoShowMarkingMode,
} from '../noShowMarking.js';

describe('noShowMarking', () => {
  it('defaults to manual_only', () => {
    expect(DEFAULT_NO_SHOW_MARKING_MODE).toBe('manual_only');
    expect(resolveNoShowMarkingMode([])).toBe('manual_only');
    expect(resolveNoShowMarkingMode([null, undefined])).toBe('manual_only');
  });

  it('resolves first non-null layer (table → area → restaurant → platform)', () => {
    expect(resolveNoShowMarkingMode(['auto', 'manual_only'])).toBe('auto');
    expect(resolveNoShowMarkingMode([null, 'manual_only', 'auto'])).toBe('manual_only');
    expect(resolveNoShowMarkingMode([undefined, null, 'auto'])).toBe('auto');
  });

  it('type-guards modes', () => {
    expect(isNoShowMarkingMode('auto')).toBe(true);
    expect(isNoShowMarkingMode('manual_only')).toBe(true);
    expect(isNoShowMarkingMode('sometimes')).toBe(false);
    expect(isNoShowMarkingMode(null)).toBe(false);
  });
});
