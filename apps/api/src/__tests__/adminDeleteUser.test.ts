import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { requestAdminDeleteUserCode } from '../services/adminDeleteUser.js';
import * as notifications from '../services/notifications.js';
import * as adminDeleteCodeStore from '../services/adminDeleteCodeStore.js';
import { emailDetailBox } from '../services/emailBranding.js';

describe('requestAdminDeleteUserCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns dev OTP without sending email in test env', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: userId,
      firstName: 'QA',
      lastName: 'Admin',
      email: 'qa-admin@test.tablevera.online',
      phone: null,
      role: 'admin',
    } as any);
    vi.spyOn(adminDeleteCodeStore, 'storeAdminDeleteCode').mockResolvedValue(undefined);
    const sendEmail = vi.spyOn(notifications, 'sendEmail').mockResolvedValue(undefined);

    const result = await requestAdminDeleteUserCode({
      adminId: adminId.toString(),
      userId: userId.toString(),
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Dev OTP: 123456');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects deleting your own account', async () => {
    const userId = new mongoose.Types.ObjectId();
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: userId,
      firstName: 'Self',
      lastName: 'Admin',
      email: 'self@test.com',
      role: 'super_admin',
    } as any);

    await expect(
      requestAdminDeleteUserCode({
        adminId: userId.toString(),
        userId: userId.toString(),
      }),
    ).rejects.toThrow('You cannot delete your own account');
  });
});

describe('delete user email HTML', () => {
  it('renders when detail values are missing', () => {
    const html = emailDetailBox([
      { label: 'User', value: 'QA Admin (qa@test.com)' },
      { label: 'Role', value: undefined as unknown as string },
      { label: 'User ID', value: 'abc123' },
    ]);
    expect(html).toContain('Role');
    expect(html).not.toContain('undefined');
  });
});
