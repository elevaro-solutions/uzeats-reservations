import { describe, it, expect, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest, registerUser, loginUser } from './helpers.js';
import {
  attachDinerProfilePhone,
  completeGoogleSignIn,
  hashOpaqueToken,
  hashPassword,
  issueTokens,
  linkGoogleAccount,
  updateMyProfile,
} from '../services/auth.js';
import { User } from '../models/User.js';
import crypto from 'node:crypto';

describe('Authentication (E2E)', () => {
  let agent: request.Agent;
  let server: any;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;
    server = app.server;
  });

  describe('Registration', () => {
    it('should register with valid input', async () => {
      const result = await registerUser(agent, {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.id).toBeTruthy();
    });

    it('should fail registration with duplicate email', async () => {
      await registerUser(agent, {
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
        firstName: 'First',
        lastName: 'User',
      });

      const res = await graphqlRequest(
        agent,
        `mutation Register($input: RegisterInput!) {
          register(input: $input) { accessToken user { id } }
        }`,
        {
          input: {
            email: 'duplicate@test.com',
            password: 'SecurePass123!',
            firstName: 'Second',
            lastName: 'User',
            phone: '+15555550999',
          },
        },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/already registered/i);
    });

    it('should fail registration without a phone number', async () => {
      const res = await graphqlRequest(
        agent,
        `mutation Register($input: RegisterInput!) {
          register(input: $input) { accessToken user { id } }
        }`,
        {
          input: {
            email: 'nophone@test.com',
            password: 'SecurePass123!',
            firstName: 'No',
            lastName: 'Phone',
          },
        },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.data?.register).toBeFalsy();
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      await registerUser(agent, {
        email: 'logintest@test.com',
        password: 'MyPassword1!',
        firstName: 'Login',
        lastName: 'Test',
      });

      const result = await loginUser(agent, 'logintest@test.com', 'MyPassword1!');
      expect(result).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should fail login with wrong password', async () => {
      await registerUser(agent, {
        email: 'wrongpass@test.com',
        password: 'CorrectPass1!',
        firstName: 'Wrong',
        lastName: 'Pass',
      });

      const res = await graphqlRequest(
        agent,
        `mutation Login($input: LoginInput!) {
          login(input: $input) { accessToken }
        }`,
        { input: { email: 'wrongpass@test.com', password: 'WrongPassword!' } },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/invalid credentials/i);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens with a valid refresh token', async () => {
      const registered = await registerUser(agent, {
        email: 'refresh@test.com',
        password: 'RefreshPass1!',
        firstName: 'Refresh',
        lastName: 'Token',
      });

      const res = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
            user { id }
          }
        }`,
        { refreshToken: registered.refreshToken },
      );

      expect(res.body.errors).toBeUndefined();
      const data = res.body.data.refreshToken;
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      expect(data.user.id).toBeTruthy();
    });

    it('should allow reuse of the previous refresh token within the grace window', async () => {
      const registered = await registerUser(agent, {
        email: 'refresh-grace@test.com',
        password: 'RefreshPass1!',
        firstName: 'Grace',
        lastName: 'Reuse',
      });

      const first = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }`,
        { refreshToken: registered.refreshToken },
      );
      expect(first.body.errors).toBeUndefined();
      expect(first.body.data.refreshToken.refreshToken).toBeTruthy();

      const reuse = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }`,
        { refreshToken: registered.refreshToken },
      );
      expect(reuse.body.errors).toBeUndefined();
      expect(reuse.body.data.refreshToken.accessToken).toBeTruthy();
      expect(reuse.body.data.refreshToken.refreshToken).toBeTruthy();
    });

    it('should reject a rotated refresh token after the grace window expires', async () => {
      const { User } = await import('../models/User.js');
      const { hashOpaqueToken } = await import('../services/auth.js');
      const registered = await registerUser(agent, {
        email: 'refresh-expired-grace@test.com',
        password: 'RefreshPass1!',
        firstName: 'Expired',
        lastName: 'Grace',
      });

      const first = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }`,
        { refreshToken: registered.refreshToken },
      );
      expect(first.body.errors).toBeUndefined();

      // Simulate grace expiry: clear grace and ensure the old hash is not stored.
      const updated = await User.findByIdAndUpdate(
        registered.user.id,
        {
          $unset: { refreshTokenGrace: 1 },
          $pull: {
            refreshTokens: {
              $in: [
                hashOpaqueToken(registered.refreshToken),
                registered.refreshToken,
              ],
            },
          },
        },
        { new: true },
      );
      expect(updated).toBeTruthy();

      const reuse = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) { accessToken }
        }`,
        { refreshToken: registered.refreshToken },
      );
      expect(reuse.body.errors).toBeDefined();
      expect(reuse.body.errors[0].message).toMatch(/invalid refresh token/i);
    });

    it('should restore me after refresh when access token is no longer valid', async () => {
      const registered = await registerUser(agent, {
        email: 'refresh-me@test.com',
        password: 'RefreshPass1!',
        firstName: 'Restore',
        lastName: 'Me',
      });

      const refreshed = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
          }
        }`,
        { refreshToken: registered.refreshToken },
      );
      expect(refreshed.body.errors).toBeUndefined();
      const accessToken = refreshed.body.data.refreshToken.accessToken as string;

      const meRes = await graphqlRequest(
        agent,
        `query { me { id email } }`,
        {},
        accessToken,
      );
      expect(meRes.body.errors).toBeUndefined();
      expect(meRes.body.data.me.id).toBe(registered.user.id);
    });
  });

  describe('Logout', () => {
    it('should invalidate refresh token on logout', async () => {
      const registered = await registerUser(agent, {
        email: 'logout@test.com',
        password: 'LogoutPass1!',
        firstName: 'Log',
        lastName: 'Out',
      });

      const logoutRes = await graphqlRequest(
        agent,
        `mutation Logout($refreshToken: String) {
          logout(refreshToken: $refreshToken)
        }`,
        { refreshToken: registered.refreshToken },
        registered.accessToken,
      );

      expect(logoutRes.body.errors).toBeUndefined();
      expect(logoutRes.body.data.logout).toBe(true);

      const refreshRes = await graphqlRequest(
        agent,
        `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) { accessToken }
        }`,
        { refreshToken: registered.refreshToken },
      );

      expect(refreshRes.body.errors).toBeDefined();
      expect(refreshRes.body.errors[0].message).toMatch(/invalid refresh token/i);
    });
  });

  describe('Protected Routes', () => {
    it('should return null for me query without auth', async () => {
      const res = await graphqlRequest(agent, `query { me { id email role } }`);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.me).toBeNull();
    });

    it('should return user for me query with valid token', async () => {
      const registered = await registerUser(agent, {
        email: 'mequery@test.com',
        password: 'MeQuery123!',
        firstName: 'Me',
        lastName: 'Query',
      });

      const res = await graphqlRequest(
        agent,
        `query { me { id email firstName lastName role } }`,
        {},
        registered.accessToken,
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.me.email).toBe('mequery@test.com');
      expect(res.body.data.me.firstName).toBe('Me');
    });
  });

  describe('Password reset', () => {
    it('should request a password reset and complete reset with token', async () => {
      const fixedToken = '11111111-2222-3333-4444-555555555555';
      const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedToken);

      await registerUser(agent, {
        email: 'reset@test.com',
        password: 'OldPassword1!',
        firstName: 'Reset',
        lastName: 'User',
      });

      const requestRes = await graphqlRequest(
        agent,
        `mutation RequestPasswordReset($email: String!, $app: String) {
          requestPasswordReset(email: $email, app: $app) {
            success
            message
            attemptsUsed
            attemptsRemaining
            maxAttempts
            supportEmail
          }
        }`,
        { email: 'reset@test.com', app: 'web' },
      );

      expect(requestRes.body.errors).toBeUndefined();
      expect(requestRes.body.data.requestPasswordReset.success).toBe(true);
      expect(requestRes.body.data.requestPasswordReset.attemptsUsed).toBe(1);
      expect(requestRes.body.data.requestPasswordReset.attemptsRemaining).toBe(2);
      expect(requestRes.body.data.requestPasswordReset.maxAttempts).toBe(3);
      expect(requestRes.body.data.requestPasswordReset.supportEmail).toBeTruthy();

      const user = await mongoose.connection.db!
        .collection('users')
        .findOne({ email: 'reset@test.com' });
      expect(user?.passwordResetToken).toBe(hashOpaqueToken(fixedToken));
      expect(user?.passwordResetExpires).toBeTruthy();

      const resetRes = await graphqlRequest(
        agent,
        `mutation ResetPassword($token: String!, $newPassword: String!) {
          resetPassword(token: $token, newPassword: $newPassword) { success message }
        }`,
        { token: fixedToken, newPassword: 'NewPassword1!' },
      );

      uuidSpy.mockRestore();

      expect(resetRes.body.errors).toBeUndefined();
      expect(resetRes.body.data.resetPassword.success).toBe(true);

      const loginRes = await loginUser(agent, 'reset@test.com', 'NewPassword1!');
      expect(loginRes.accessToken).toBeTruthy();
    });

    it('should reject reset with invalid token', async () => {
      const res = await graphqlRequest(
        agent,
        `mutation ResetPassword($token: String!, $newPassword: String!) {
          resetPassword(token: $token, newPassword: $newPassword) { success message }
        }`,
        { token: 'invalid-token', newPassword: 'NewPassword1!' },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/invalid or expired/i);
    });
  });

  describe('Demo email equivalents', () => {
    it('logs in as a@tablevera.local when the stored super admin is still admin@tablevera.local', async () => {
      await User.create({
        email: 'admin@tablevera.local',
        passwordHash: await hashPassword('Password123!'),
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'super_admin',
        emailVerified: true,
      });

      const res = await graphqlRequest(
        agent,
        `mutation Login($input: LoginInput!) {
          login(input: $input) { accessToken user { id email role } }
        }`,
        { input: { email: 'a@tablevera.local', password: 'Password123!' } },
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.login.user.email).toBe('admin@tablevera.local');
      expect(res.body.data.login.user.role).toBe('super_admin');
    });

    it('tells Google-only accounts to use Google sign-in instead of invalid credentials', async () => {
      await User.create({
        email: 'google-only@test.com',
        googleId: 'google-sub-123',
        firstName: 'Google',
        lastName: 'User',
        role: 'diner',
        emailVerified: true,
      });

      const res = await graphqlRequest(
        agent,
        `mutation Login($input: LoginInput!) {
          login(input: $input) { accessToken user { id email role } }
        }`,
        { input: { email: 'google-only@test.com', password: 'Password123!' } },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/google sign-in/i);
    });
  });

  describe('Profile phone on booking', () => {
    it('saves a phone onto a diner who signed up without one', async () => {
      const diner = await User.create({
        email: 'google-book@test.com',
        googleId: 'google-book-1',
        firstName: 'Google',
        lastName: 'Booker',
        role: 'diner',
        emailVerified: true,
      });

      await expect(
        attachDinerProfilePhone(diner._id.toString()),
      ).rejects.toThrow(/phone number is required/i);

      await attachDinerProfilePhone(diner._id.toString(), '+15555550123');
      const saved = await User.findById(diner._id);
      expect(saved?.phone).toBe('+15555550123');

      await attachDinerProfilePhone(diner._id.toString(), '+15555550987');
      const unchanged = await User.findById(diner._id);
      expect(unchanged?.phone).toBe('+15555550123');
    });

    it('rejects a phone already used by another account', async () => {
      await User.create({
        email: 'phone-owner@test.com',
        phone: '+15555550444',
        firstName: 'Owner',
        lastName: 'Phone',
        role: 'diner',
        emailVerified: true,
      });
      const diner = await User.create({
        email: 'phone-needed@test.com',
        googleId: 'google-book-2',
        firstName: 'Needs',
        lastName: 'Phone',
        role: 'diner',
        emailVerified: true,
      });

      await expect(
        attachDinerProfilePhone(diner._id.toString(), '+15555550444'),
      ).rejects.toThrow(/already used/i);
    });
  });

  describe('Update my profile', () => {
    const UPDATE_MY_PROFILE = `
      mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
        updateMyProfile(input: $input) {
          id
          email
          phone
          emailVerified
          hasPassword
          hasGoogle
          address { line1 line2 city state zip country }
        }
      }
    `;

    it('updates email, phone, and address when the current password is correct', async () => {
      const registered = await registerUser(agent, {
        email: 'profile-edit@test.com',
        password: 'Password123!',
        firstName: 'Pat',
        lastName: 'Diner',
      });

      const res = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            email: 'profile-edit-new@test.com',
            phone: '+19995550101',
            address: {
              line1: '1 Main St',
              line2: 'Apt 2',
              city: 'Austin',
              state: 'tx',
              zip: '78701',
            },
            currentPassword: 'Password123!',
          },
        },
        registered.accessToken,
      );

      expect(res.body.errors).toBeUndefined();
      const profile = res.body.data.updateMyProfile;
      expect(profile.email).toBe('profile-edit-new@test.com');
      expect(profile.phone).toBe('+19995550101');
      expect(profile.emailVerified).toBe(false);
      expect(profile.hasPassword).toBe(true);
      expect(profile.address).toMatchObject({
        line1: '1 Main St',
        line2: 'Apt 2',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
      });
    });

    it('rejects a wrong current password as a field error', async () => {
      const registered = await registerUser(agent, {
        email: 'profile-password@test.com',
        password: 'Password123!',
        firstName: 'Pat',
        lastName: 'Diner',
      });

      const res = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            email: 'profile-password-new@test.com',
            currentPassword: 'WrongPass1!',
          },
        },
        registered.accessToken,
      );

      expect(res.body.errors?.[0]?.message).toMatch(/current password is incorrect/i);
      expect(res.body.errors[0].extensions?.code).not.toBe('UNAUTHENTICATED');

      const user = await User.findOne({ email: 'profile-password@test.com' });
      await expect(
        updateMyProfile(user!._id.toString(), {
          email: 'profile-password-new@test.com',
          currentPassword: 'WrongPass1!',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { field: 'currentPassword' },
      });

      const unchanged = await graphqlRequest(
        agent,
        `query Me { me { email } }`,
        undefined,
        registered.accessToken,
      );
      expect(unchanged.body.data.me.email).toBe('profile-password@test.com');
    });

    it('changes the password and signs in with the new one', async () => {
      await registerUser(agent, {
        email: 'profile-reset@test.com',
        password: 'Password123!',
        firstName: 'Pat',
        lastName: 'Diner',
      });
      const loggedIn = await loginUser(agent, 'profile-reset@test.com', 'Password123!');

      const res = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            currentPassword: 'Password123!',
            newPassword: 'NewPassword1!',
          },
        },
        loggedIn.accessToken,
      );
      expect(res.body.errors).toBeUndefined();

      const oldLogin = await graphqlRequest(agent, `
        mutation Login($input: LoginInput!) {
          login(input: $input) { accessToken }
        }
      `, { input: { email: 'profile-reset@test.com', password: 'Password123!' } });
      expect(oldLogin.body.errors).toBeDefined();

      const next = await loginUser(agent, 'profile-reset@test.com', 'NewPassword1!');
      expect(next.accessToken).toBeTruthy();
    });

    it('rejects an email or phone already used by another account', async () => {
      await registerUser(agent, {
        email: 'profile-taken@test.com',
        password: 'Password123!',
        firstName: 'Taken',
        lastName: 'User',
        phone: '+19995550102',
      });
      const registered = await registerUser(agent, {
        email: 'profile-free@test.com',
        password: 'Password123!',
        firstName: 'Free',
        lastName: 'User',
      });

      const emailRes = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            email: 'profile-taken@test.com',
            currentPassword: 'Password123!',
          },
        },
        registered.accessToken,
      );
      expect(emailRes.body.errors?.[0]?.message).toMatch(/already registered/i);
      const freeUser = await User.findOne({ email: 'profile-free@test.com' });
      await expect(
        updateMyProfile(freeUser!._id.toString(), {
          email: 'profile-taken@test.com',
          currentPassword: 'Password123!',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        details: { field: 'email' },
      });

      const phoneRes = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        { input: { phone: '+19995550102' } },
        registered.accessToken,
      );
      expect(phoneRes.body.errors?.[0]?.message).toMatch(/already used/i);
      await expect(
        updateMyProfile(freeUser!._id.toString(), { phone: '+19995550102' }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        details: { field: 'phone' },
      });
    });

    it('lets a passwordless Google account set a password and clear phone and address', async () => {
      const diner = await User.create({
        email: 'profile-google@test.com',
        googleId: 'google-profile-1',
        phone: '+19995550103',
        firstName: 'Google',
        lastName: 'Diner',
        role: 'diner',
        emailVerified: true,
        address: {
          line1: '9 Old Rd',
          city: 'Austin',
          state: 'TX',
          zip: '78702',
          country: 'US',
        },
      });
      const { accessToken } = await issueTokens(diner);

      const blockedEmail = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        { input: { email: 'profile-google-new@test.com' } },
        accessToken,
      );
      expect(blockedEmail.body.errors?.[0]?.message).toMatch(/google sign-in is linked/i);
      expect(blockedEmail.body.errors?.[0]?.extensions?.code).not.toBe('UNAUTHENTICATED');
      await expect(
        updateMyProfile(diner._id.toString(), { email: 'profile-google-new@test.com' }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      });

      const saved = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            newPassword: 'NewPassword1!',
            address: {
              line1: '9 Old Rd',
              city: 'Austin',
              state: 'TX',
              zip: '78702',
            },
          },
        },
        accessToken,
      );
      expect(saved.body.errors).toBeUndefined();
      expect(saved.body.data.updateMyProfile.hasPassword).toBe(true);
      expect(saved.body.data.updateMyProfile.hasGoogle).toBe(true);
      expect(saved.body.data.updateMyProfile.email).toBe('profile-google@test.com');

      const cleared = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        { input: { phone: '', clearAddress: true } },
        accessToken,
      );
      expect(cleared.body.errors).toBeUndefined();
      expect(cleared.body.data.updateMyProfile.phone).toBeNull();
      expect(cleared.body.data.updateMyProfile.address).toBeNull();

      const stored = await User.findById(diner._id);
      expect(stored?.phone).toBeFalsy();
      expect(stored?.address?.line1).toBeFalsy();
      expect(stored?.passwordHash).toBeTruthy();
      expect(stored?.email).toBe('profile-google@test.com');
    });

    it('unlinks Google after a password exists and then allows email changes', async () => {
      const diner = await User.create({
        email: 'profile-unlink@test.com',
        googleId: 'google-unlink-1',
        firstName: 'Google',
        lastName: 'Unlink',
        role: 'diner',
        emailVerified: true,
      });
      const { accessToken } = await issueTokens(diner);

      await expect(
        updateMyProfile(diner._id.toString(), { unlinkGoogle: true }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { field: 'newPassword' },
      });

      const unlinked = await graphqlRequest(
        agent,
        UPDATE_MY_PROFILE,
        {
          input: {
            newPassword: 'EmailPass1!',
            unlinkGoogle: true,
            email: 'profile-unlinked@test.com',
          },
        },
        accessToken,
      );
      expect(unlinked.body.errors).toBeUndefined();
      expect(unlinked.body.data.updateMyProfile.hasGoogle).toBe(false);
      expect(unlinked.body.data.updateMyProfile.hasPassword).toBe(true);
      expect(unlinked.body.data.updateMyProfile.email).toBe('profile-unlinked@test.com');

      const stored = await User.findById(diner._id);
      expect(stored?.googleId).toBeFalsy();
      expect(stored?.passwordHash).toBeTruthy();
      expect(stored?.email).toBe('profile-unlinked@test.com');
    });

    it('does not auto-relink Google on sign-in after unlink; linkGoogle requires matching email', async () => {
      const diner = await User.create({
        email: 'profile-relink@test.com',
        passwordHash: await hashPassword('EmailPass1!'),
        firstName: 'Relink',
        lastName: 'User',
        role: 'diner',
        emailVerified: true,
      });

      await expect(
        completeGoogleSignIn({
          sub: 'google-relink-1',
          email: 'profile-relink@test.com',
          email_verified: true,
          given_name: 'Relink',
          family_name: 'User',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        details: { field: 'email' },
      });

      await expect(
        linkGoogleAccount(diner._id.toString(), {
          sub: 'google-relink-1',
          email: 'other@test.com',
          email_verified: true,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      });

      await expect(
        linkGoogleAccount(diner._id.toString(), {
          sub: 'google-relink-1',
          email: 'profile-relink@test.com',
          email_verified: false,
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

      const linked = await linkGoogleAccount(diner._id.toString(), {
        sub: 'google-relink-1',
        email: 'profile-relink@test.com',
        email_verified: true,
      });
      expect(linked.googleId).toBe('google-relink-1');

      const signedIn = await completeGoogleSignIn({
        sub: 'google-relink-1',
        email: 'profile-relink@test.com',
        email_verified: true,
      });
      expect(signedIn.user._id.toString()).toBe(diner._id.toString());
      expect(signedIn.accessToken).toBeTruthy();
    });

    it('requires authentication', async () => {
      const res = await graphqlRequest(agent, UPDATE_MY_PROFILE, {
        input: { phone: '+19995550109' },
      });
      expect(res.body.errors?.[0]?.message).toMatch(/authentication required/i);
    });
  });
});
