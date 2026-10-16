import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import express from 'express';
import request from 'supertest';
import { typeDefs } from '../graphql/typeDefs.js';
import { resolvers } from '../graphql/resolvers.js';
import { createContext } from '../graphql/context.js';
import { PLANS } from '../config/plans.js';
import { Subscription } from '../models/Subscription.js';

export async function createTestApp(): Promise<{
  app: express.Express;
  server: { stop(): Promise<void> };
  agent: ReturnType<typeof request>;
}> {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => createContext({ req, res }),
    }),
  );

  const agent = request(app);
  return { app, server, agent };
}

export function graphqlRequest(
  agent: request.Agent,
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
  extraHeaders?: Record<string, string>,
) {
  const req = agent.post('/graphql').send({ query, variables });
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      req.set(key, value);
    }
  }
  return req;
}

let testPhoneSeq = 0;

/** Unique E.164 so diner signup tests satisfy the required phone field. */
function nextTestPhone() {
  testPhoneSeq += 1;
  return `+1${String(5550000000 + testPhoneSeq)}`;
}

/** Active Basic plan so the restaurant stays on public search and can take diner bookings. */
export async function ensurePublicListing(restaurantId: string) {
  const fields = {
    plan: 'basic',
    status: 'active' as const,
    monthlyPriceCents: PLANS.basic.monthlyPriceCents,
    networkCoverFeeCents: PLANS.basic.networkCoverFeeCents,
    websiteCoverFeeCents: PLANS.basic.websiteCoverFeeCents,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    cancelAtPeriodEnd: false,
  };
  const existing = await Subscription.findOne({ restaurantId });
  if (existing && ['trialing', 'active', 'past_due'].includes(existing.status)) return existing;
  if (existing) {
    Object.assign(existing, fields);
    return existing.save();
  }
  return Subscription.create({ restaurantId, ...fields });
}

export async function registerUser(
  agent: request.Agent,
  input: { email: string; password: string; firstName: string; lastName: string; phone?: string },
) {
  const res = await graphqlRequest(agent, REGISTER_MUTATION, {
    input: { ...input, phone: input.phone ?? nextTestPhone() },
  });
  const data = res.body.data?.register;
  return data as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
}

export async function loginUser(agent: request.Agent, email: string, password: string) {
  const res = await graphqlRequest(agent, LOGIN_MUTATION, { input: { email, password } });
  const data = res.body.data?.login;
  return data as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
}

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user { id email firstName lastName role loyaltyPoints }
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user { id email role }
    }
  }
`;
