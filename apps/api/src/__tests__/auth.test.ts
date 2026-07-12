import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest, registerUser, loginUser } from './helpers.js';

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
          },
        },
      );

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toMatch(/already registered/i);
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
});
