import { describe, expect, it } from 'vitest';

/**
 * Lightweight shape check for owner overview aggregation helpers.
 * Full DB coverage lives in integration runs; this keeps the module importable.
 */
describe('ownerOverview module', () => {
  it('exports buildOwnerOverview', async () => {
    const mod = await import('../services/ownerOverview.js');
    expect(typeof mod.buildOwnerOverview).toBe('function');
  });
});
