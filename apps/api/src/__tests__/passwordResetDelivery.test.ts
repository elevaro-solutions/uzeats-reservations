import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPlatformOwnedEmail,
  MAX_PASSWORD_RESET_REQUESTS,
  requestPasswordReset,
  resolvePasswordResetDeliveryEmail,
} from '../services/auth.js';
import { PasswordResetAttempt } from '../models/PasswordResetAttempt.js';
import * as platformConfig from '../services/platformConfig.js';
import { User } from '../models/User.js';

describe('password reset delivery routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects platform-owned @tablevera.online addresses', () => {
    expect(isPlatformOwnedEmail('owner@tablevera.online')).toBe(true);
    expect(isPlatformOwnedEmail('Owner@Tablevera.Online')).toBe(true);
    expect(isPlatformOwnedEmail('owner@example.com')).toBe(false);
    expect(isPlatformOwnedEmail('support.uzeats@gmail.com')).toBe(false);
  });

  it('keeps normal account emails as the delivery target', async () => {
    await expect(resolvePasswordResetDeliveryEmail('diner@example.com')).resolves.toBe(
      'diner@example.com',
    );
  });

  it('routes @tablevera.online resets to Support contacts supportEmail', async () => {
    vi.spyOn(platformConfig, 'getPlatformConfig').mockResolvedValue({} as any);
    vi.spyOn(platformConfig, 'mapPlatformConfig').mockReturnValue({
      supportEmail: 'support.uzeats@gmail.com',
    } as any);

    await expect(
      resolvePasswordResetDeliveryEmail('ops@tablevera.online'),
    ).resolves.toBe('support.uzeats@gmail.com');
  });

  it('falls back to the super-admin inbox when Support contacts is also platform-owned', async () => {
    vi.spyOn(platformConfig, 'getPlatformConfig').mockResolvedValue({} as any);
    vi.spyOn(platformConfig, 'mapPlatformConfig').mockReturnValue({
      supportEmail: 'support@tablevera.online',
    } as any);

    await expect(
      resolvePasswordResetDeliveryEmail('ops@tablevera.online'),
    ).resolves.toBe('support.uzeats@gmail.com');
  });
});

describe('password reset request limits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(platformConfig, 'getPlatformConfig').mockResolvedValue({} as any);
    vi.spyOn(platformConfig, 'mapPlatformConfig').mockReturnValue({
      supportEmail: 'support.uzeats@gmail.com',
    } as any);
    vi.spyOn(User, 'findOne').mockResolvedValue(null as any);
  });

  it(`allows ${MAX_PASSWORD_RESET_REQUESTS} requests then asks the user to contact support`, async () => {
    let count = 0;
    vi.spyOn(PasswordResetAttempt, 'findOne').mockImplementation(async () => {
      if (count === 0) return null;
      return {
        email: 'limit@test.com',
        count,
        windowStartedAt: new Date(),
      } as any;
    });
    vi.spyOn(PasswordResetAttempt, 'findOneAndUpdate').mockImplementation(async (_filter, update) => {
      if (update && typeof update === 'object' && '$set' in update) {
        count = 1;
        return { email: 'limit@test.com', count: 1, windowStartedAt: new Date() } as any;
      }
      if (update && typeof update === 'object' && '$inc' in update) {
        count += 1;
        return { email: 'limit@test.com', count, windowStartedAt: new Date() } as any;
      }
      return null;
    });

    const first = await requestPasswordReset('limit@test.com', 'web');
    expect(first.attemptsUsed).toBe(1);
    expect(first.attemptsRemaining).toBe(2);

    const second = await requestPasswordReset('limit@test.com', 'web');
    expect(second.attemptsUsed).toBe(2);
    expect(second.attemptsRemaining).toBe(1);

    const third = await requestPasswordReset('limit@test.com', 'web');
    expect(third.attemptsUsed).toBe(3);
    expect(third.attemptsRemaining).toBe(0);
    expect(third.message).toMatch(/contact support/i);

    const blocked = await requestPasswordReset('limit@test.com', 'web');
    expect(blocked.attemptsRemaining).toBe(0);
    expect(blocked.supportEmail).toBe('support.uzeats@gmail.com');
    expect(blocked.message).toMatch(/reached the limit/i);
  });
});

