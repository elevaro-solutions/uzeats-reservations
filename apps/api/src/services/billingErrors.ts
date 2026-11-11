import { AppError, formatMongooseError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { formatStripeError } from './stripe.js';

/**
 * Re-throw errors the client can already read (app, Stripe, Mongoose). Anything else would be
 * masked as "Internal server error" in production, so log it and throw a billing-specific error.
 */
export async function withBillingErrors<T>(
  action: string,
  context: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof AppError || formatStripeError(err) || formatMongooseError(err)) throw err;
    logger.error({ err, ...context, action }, '[billing] unexpected failure');
    throw new AppError(
      `Could not ${action}. Please try again or contact support.`,
      'BILLING_FAILED',
      500,
    );
  }
}
