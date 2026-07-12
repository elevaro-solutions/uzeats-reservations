import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import express from 'express';
import request from 'supertest';
import { typeDefs } from '../graphql/typeDefs.js';
import { resolvers } from '../graphql/resolvers.js';
import { createContext } from '../graphql/context.js';

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
      context: async ({ req }) => createContext({ req }),
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
) {
  const req = agent.post('/graphql').send({ query, variables });
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  return req;
}

export async function registerUser(
  agent: request.Agent,
  input: { email: string; password: string; firstName: string; lastName: string; phone?: string },
) {
  const res = await graphqlRequest(agent, REGISTER_MUTATION, { input });
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
