import { describe, it, expect } from 'vitest';
import { env } from '../config/env.js';
import {
  defaultRequireSignupEmailVerification,
  resolveRequireSignupEmailVerification,
} from '../services/platformConfig.js';

describe('requireSignupEmailVerification defaults', () => {
  it('matches NODE_ENV === production for the unset default', () => {
    expect(defaultRequireSignupEmailVerification()).toBe(env.NODE_ENV === 'production');
    expect(env.NODE_ENV).not.toBe('production');
    expect(resolveRequireSignupEmailVerification(undefined)).toBe(false);
    expect(resolveRequireSignupEmailVerification(null)).toBe(false);
  });

  it('honors an explicit boolean over the env default', () => {
    expect(resolveRequireSignupEmailVerification(true)).toBe(true);
    expect(resolveRequireSignupEmailVerification(false)).toBe(false);
  });
});
