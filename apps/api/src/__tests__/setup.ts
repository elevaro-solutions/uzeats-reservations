import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-16-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-16-chars';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';
process.env.AUTH_DEV_OTP = 'true';
process.env.MONGODB_URI = 'mongodb://placeholder';

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = vi.fn().mockResolvedValue({});
    close = vi.fn().mockResolvedValue(undefined);
  },
  Worker: class MockWorker {
    constructor() {}
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('ioredis', () => {
  const Redis = vi.fn(() => ({
    status: 'ready',
    connect: vi.fn(),
    disconnect: vi.fn(),
    quit: vi.fn(),
  }));
  return { default: Redis, Redis };
});

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);

  // Ensure all indexes (incl. the Restaurant text index used by search)
  // are built before tests query them.
  await import('../models/index.js');
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.createIndexes()),
  );
});

afterEach(async () => {
  // Individual test files manage their own cleanup.
  // Global afterEach intentionally left empty to allow
  // sequential integration tests to build on prior state.
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
