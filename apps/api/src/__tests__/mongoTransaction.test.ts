import { describe, expect, it } from 'vitest';
import { isMongoTransactionUnsupported } from '../lib/mongoTransaction.js';

describe('isMongoTransactionUnsupported', () => {
  it('detects IllegalOperation code 20', () => {
    expect(
      isMongoTransactionUnsupported({
        code: 20,
        codeName: 'IllegalOperation',
        message: 'Transaction numbers are only allowed on a replica set member or mongos',
      }),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isMongoTransactionUnsupported(new Error('Already reviewed'))).toBe(false);
    expect(isMongoTransactionUnsupported(null)).toBe(false);
  });
});
