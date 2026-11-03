import { describe, expect, it } from 'vitest';
import {
  duplicateKeyMessage,
  formatGraphqlInputMessage,
  formatMongooseError,
} from '../errors.js';

describe('formatMongooseError duplicate keys', () => {
  it('maps a phone unique-index error to a conflict the client can show', () => {
    const err = Object.assign(new Error('E11000 duplicate key'), {
      name: 'MongoServerError',
      code: 11000,
      keyPattern: { phone: 1 },
    });
    const formatted = formatMongooseError(err);
    expect(formatted?.code).toBe('CONFLICT');
    expect(formatted?.message).toBe('Phone already in use');
    expect(formatted?.message).not.toContain('+1');
  });

  it('maps email and slug indexes', () => {
    expect(duplicateKeyMessage('email_1')).toBe('Email already registered');
    expect(duplicateKeyMessage('slug_1')).toBe('That URL slug is already in use');
  });
});

describe('formatGraphqlInputMessage', () => {
  it('rewrites a GraphQL Int overflow into a form message', () => {
    expect(
      formatGraphqlInputMessage(
        'Int cannot represent non 32-bit signed integer value: 2312412300',
      ),
    ).toBe('A number in this form is too large (2312412300). Use a smaller amount.');
  });

  it('leaves unrelated errors masked', () => {
    expect(formatGraphqlInputMessage('Cannot read properties of undefined')).toBeNull();
  });
});
