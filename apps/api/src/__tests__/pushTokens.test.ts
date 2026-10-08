import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest, registerUser } from './helpers.js';
import { User } from '../models/User.js';

const REGISTER_PUSH = `
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

const UNREGISTER_PUSH = `
  mutation UnregisterPushToken($token: String!) {
    unregisterPushToken(token: $token)
  }
`;

const LOGOUT = `
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`;

describe('Push tokens', () => {
  let agent: request.Agent;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;
  });

  it('stores a token on register', async () => {
    const user = await registerUser(agent, {
      email: 'push-a@test.com',
      password: 'SecurePass123!',
      firstName: 'Push',
      lastName: 'Alpha',
    });

    const res = await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: 'ExponentPushToken[device-a]', platform: 'ios' },
      user.accessToken,
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.registerPushToken).toBe(true);

    const doc = await User.findById(user.user.id).lean();
    expect(doc?.pushTokens).toEqual([
      { token: 'ExponentPushToken[device-a]', platform: 'ios' },
    ]);
  });

  it('unregisters with and without Authorization', async () => {
    const user = await registerUser(agent, {
      email: 'push-b@test.com',
      password: 'SecurePass123!',
      firstName: 'Push',
      lastName: 'Beta',
    });

    await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: 'ExponentPushToken[device-b-auth]', platform: 'android' },
      user.accessToken,
    );
    await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: 'ExponentPushToken[device-b-anon]', platform: 'ios' },
      user.accessToken,
    );

    const authed = await graphqlRequest(
      agent,
      UNREGISTER_PUSH,
      { token: 'ExponentPushToken[device-b-auth]' },
      user.accessToken,
    );
    expect(authed.body.errors).toBeUndefined();
    expect(authed.body.data.unregisterPushToken).toBe(true);

    const anon = await graphqlRequest(agent, UNREGISTER_PUSH, {
      token: 'ExponentPushToken[device-b-anon]',
    });
    expect(anon.body.errors).toBeUndefined();
    expect(anon.body.data.unregisterPushToken).toBe(true);

    const doc = await User.findById(user.user.id).lean();
    expect(doc?.pushTokens).toEqual([]);
  });

  it('moves a device token from user A to user B on register', async () => {
    const userA = await registerUser(agent, {
      email: 'push-share-a@test.com',
      password: 'SecurePass123!',
      firstName: 'Share',
      lastName: 'A',
    });
    const userB = await registerUser(agent, {
      email: 'push-share-b@test.com',
      password: 'SecurePass123!',
      firstName: 'Share',
      lastName: 'B',
    });

    const shared = 'ExponentPushToken[shared-device]';
    await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: shared, platform: 'ios' },
      userA.accessToken,
    );
    await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: shared, platform: 'ios' },
      userB.accessToken,
    );

    const docA = await User.findById(userA.user.id).lean();
    const docB = await User.findById(userB.user.id).lean();
    expect(docA?.pushTokens).toEqual([]);
    expect(docB?.pushTokens).toEqual([{ token: shared, platform: 'ios' }]);
  });

  it('does not clear push tokens on logout by itself', async () => {
    const user = await registerUser(agent, {
      email: 'push-logout@test.com',
      password: 'SecurePass123!',
      firstName: 'Push',
      lastName: 'Logout',
    });

    await graphqlRequest(
      agent,
      REGISTER_PUSH,
      { token: 'ExponentPushToken[logout-device]', platform: 'ios' },
      user.accessToken,
    );

    const logoutRes = await graphqlRequest(
      agent,
      LOGOUT,
      { refreshToken: user.refreshToken },
      user.accessToken,
    );
    expect(logoutRes.body.errors).toBeUndefined();
    expect(logoutRes.body.data.logout).toBe(true);

    const doc = await User.findById(user.user.id).lean();
    expect(doc?.pushTokens).toEqual([
      { token: 'ExponentPushToken[logout-device]', platform: 'ios' },
    ]);
  });

  it('rejects a blank token', async () => {
    const res = await graphqlRequest(agent, UNREGISTER_PUSH, { token: '   ' });
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/push token is required/i);
  });
});
