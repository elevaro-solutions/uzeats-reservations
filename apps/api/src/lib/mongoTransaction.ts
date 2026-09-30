import mongoose, { type ClientSession } from 'mongoose';

/** Cached after first probe — prod Dokku Mongo is often standalone (no txn support). */
let cachedSupportsTransactions: boolean | null = null;

export function isMongoTransactionUnsupported(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; codeName?: string; message?: string };
  if (e.code === 20 || e.codeName === 'IllegalOperation') return true;
  return (
    typeof e.message === 'string' &&
    e.message.includes('Transaction numbers are only allowed')
  );
}

/**
 * Run `fn` inside a multi-doc transaction when the deployment supports it
 * (replica set / mongos). On standalone Mongo, fall back to no session so
 * loyalty awards still succeed in production.
 */
export async function withOptionalTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  if (cachedSupportsTransactions === false) {
    return fn(undefined);
  }

  const session = await mongoose.startSession();
  try {
    let result!: T;
    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      cachedSupportsTransactions = true;
      return result;
    } catch (err) {
      if (!isMongoTransactionUnsupported(err)) throw err;
      cachedSupportsTransactions = false;
      return fn(undefined);
    }
  } finally {
    await session.endSession();
  }
}
