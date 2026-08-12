import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { rateLimit } from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { connectDb } from './db.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { createContext } from './graphql/context.js';
import { constructStripeEvent } from './services/stripe.js';
import { confirmDeposit } from './services/reservations.js';
import { startNotificationWorkers } from './services/notifications.js';
import { ensureDefaultEmailTemplates } from './services/emailTemplates.js';
import { startCampaignWorker } from './services/campaigns.js';
import { startLoyaltyWorker } from './services/loyaltyExpiry.js';
import { handleTelegramWebhook, startTelegramBot } from './services/telegram.js';
import { logger } from './lib/logger.js';
import { AppError, formatMongooseError } from './lib/errors.js';
import { posRouter } from './routes/pos.js';
import { partnerRouter } from './routes/partner.js';
import { uploadsRouter } from './routes/uploads.js';

const startedAt = Date.now();

async function main() {
  await connectDb();
  await ensureDefaultEmailTemplates();
  startNotificationWorkers();
  startCampaignWorker();
  startLoyaltyWorker();

  const app = express();

  app.use(
    helmet({
      // API-only: no HTML CSP; allow cross-origin GraphQL/fetch from web apps.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const graphqlLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many requests, please try again later' }] },
  });

  const authGraphqlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many auth attempts, please try again later' }] },
  });

  const partnerLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many uploads' },
  });

  const SENSITIVE_GRAPHQL =
    /\b(login|register|registerRestaurantPartner|requestPhoneOtp|verifyPhoneOtp|requestPasswordReset|resetPassword|validateGiftCard|refreshToken)\b/i;

  function isSensitiveGraphql(req: express.Request) {
    const body = req.body as { operationName?: string; query?: string } | undefined;
    const haystack = `${body?.operationName ?? ''}\n${body?.query ?? ''}`;
    return SENSITIVE_GRAPHQL.test(haystack);
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: env.NODE_ENV !== 'production',
    validationRules: [
      depthLimit(12),
      createComplexityLimitRule(25_000, {
        onCost: (cost) => {
          if (env.NODE_ENV !== 'production' && cost > 5_000) {
            logger.debug({ cost }, '[graphql] query cost');
          }
        },
      }),
    ],
    formatError(formattedError, error) {
      const original = (error as { originalError?: Error }).originalError;

      if (original instanceof AppError) {
        return {
          message: original.message,
          extensions: { code: original.code },
        };
      }

      if (original instanceof ZodError) {
        return {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION_ERROR',
            issues: original.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          },
        };
      }

      const mongooseError = formatMongooseError(original);
      if (mongooseError) {
        return {
          message: mongooseError.message,
          extensions: { code: mongooseError.code },
        };
      }

      logger.error({ err: original ?? formattedError }, '[graphql] unexpected error');

      if (env.NODE_ENV === 'production') {
        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      return formattedError;
    },
  });
  await server.start();

  app.post(
    '/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const signature = req.headers['stripe-signature'];
        if (!signature || typeof signature !== 'string') {
          res.status(400).send('Missing signature');
          return;
        }
        const event = await constructStripeEvent(req.body as Buffer, signature);
        if (
          event.type === 'payment_intent.succeeded' ||
          event.type === 'payment_intent.amount_capturable_updated'
        ) {
          const intent = event.data.object as { id: string };
          await confirmDeposit(intent.id);
        } else if (
          event.type === 'invoice.paid' ||
          event.type === 'invoice.payment_failed' ||
          event.type === 'invoice.finalized' ||
          event.type === 'invoice.voided' ||
          event.type === 'invoice.updated'
        ) {
          const { syncStripeInvoice } = await import('./services/stripeSync.js');
          await syncStripeInvoice(event.data.object as any);
        } else if (
          event.type === 'customer.subscription.updated' ||
          event.type === 'customer.subscription.deleted'
        ) {
          const { handleStripeSubscriptionEvent } = await import('./services/stripeSync.js');
          await handleStripeSubscriptionEvent(event.type, event.data.object as any);
        }
        res.json({ received: true });
      } catch (err) {
        logger.error({ err }, '[stripe webhook]');
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    },
  );

  app.post('/webhooks/telegram', express.json(), (req, res) => {
    void handleTelegramWebhook(req, res);
  });

  app.use('/api/pos', express.json(), cors({
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
  }), posRouter);

  const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim());

  // Partner booking API (third-party sites, affiliates, Google Reserve)
  app.use(
    '/api/partner',
    partnerLimiter,
    express.json(),
    cors({ origin: corsOrigins }),
    partnerRouter,
  );

  app.use(
    '/api/uploads',
    uploadLimiter,
    cors({ origin: corsOrigins, credentials: true }),
    express.raw({ type: () => true, limit: '10mb' }),
    uploadsRouter,
  );

  app.use(
    '/graphql',
    graphqlLimiter,
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
    express.json({ limit: '2mb' }),
    (req, res, next) => {
      if (isSensitiveGraphql(req)) {
        authGraphqlLimiter(req, res, next);
        return;
      }
      next();
    },
    (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const body = req.body as { operationName?: string } | undefined;
        logger.info({
          op: body?.operationName ?? 'anonymous',
          ms: Date.now() - start,
          status: res.statusCode,
        }, '[graphql] request');
      });
      next();
    },
    expressMiddleware(server, {
      context: async ({ req, res }) => createContext({ req, res }),
    }),
  );

  app.get('/health', async (_req, res) => {
    const mongoState = mongoose.connection.readyState;
    const mongoStatus: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    let redisOk = false;
    try {
      const redis = new Redis(env.REDIS_URL);
      const pong = await redis.ping();
      redisOk = pong === 'PONG';
      await redis.quit();
    } catch {
      redisOk = false;
    }

    const healthy = mongoState === 1;

    res.status(healthy ? 200 : 503).json({
      ok: healthy,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      mongo: mongoStatus[mongoState] ?? 'unknown',
      redis: redisOk ? 'connected' : 'disconnected',
    });
  });

  app.listen(env.PORT, () => {
    logger.info(`[api] GraphQL ready at http://localhost:${env.PORT}/graphql`);
    void startTelegramBot().catch((err) => {
      logger.error({ err }, '[telegram] failed to start bot');
    });
  });
}

main().catch((err) => {
  logger.fatal({ err }, '[api] failed to start');
  process.exit(1);
});
