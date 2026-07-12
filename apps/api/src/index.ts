import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { rateLimit } from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { connectDb } from './db.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { createContext } from './graphql/context.js';
import { constructStripeEvent } from './services/stripe.js';
import { confirmDeposit } from './services/reservations.js';
import { startNotificationWorkers } from './services/notifications.js';
import { startCampaignWorker } from './services/campaigns.js';
import { logger } from './lib/logger.js';
import { AppError } from './lib/errors.js';
import { posRouter } from './routes/pos.js';
import { partnerRouter } from './routes/partner.js';

const startedAt = Date.now();

async function main() {
  await connectDb();
  startNotificationWorkers();
  startCampaignWorker();

  const app = express();

  const graphqlLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many requests, please try again later' }] },
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
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
        }
        res.json({ received: true });
      } catch (err) {
        logger.error({ err }, '[stripe webhook]');
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    },
  );

  app.use('/api/pos', express.json(), cors({
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
  }), posRouter);

  // Partner booking API (third-party sites, affiliates, Google Reserve)
  app.use('/api/partner', express.json(), cors(), partnerRouter);

  app.use(
    '/graphql',
    graphqlLimiter,
    cors({
      origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
      credentials: true,
    }),
    express.json({ limit: '2mb' }),
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
      context: async ({ req }) => createContext({ req }),
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
  });
}

main().catch((err) => {
  logger.fatal({ err }, '[api] failed to start');
  process.exit(1);
});
