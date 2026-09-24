import type { ApolloServer } from '@apollo/server';
import type { Request, Response, NextFunction } from 'express';
import type { GraphQLContext } from '../graphql/context.js';

type GraphqlBody = {
  query?: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  extensions?: Record<string, unknown>;
};

/**
 * Apollo Server 4 has no built-in HTTP batching. BatchHttpLink POSTs an array of
 * operations — handle that here with one shared context so DataLoaders batch across
 * the whole fan-out (restaurant page waterfall, DashShell polls, etc.).
 */
export function graphqlBatchMiddleware(
  server: ApolloServer<GraphQLContext>,
  createContext: (args: {
    req: Request;
    res: Response;
  }) => Promise<GraphQLContext>,
) {
  return async function handleGraphqlBatch(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!Array.isArray(req.body)) {
      next();
      return;
    }

    const operations = req.body as GraphqlBody[];
    if (operations.length === 0) {
      res.status(400).json({ errors: [{ message: 'Empty GraphQL batch' }] });
      return;
    }
    if (operations.length > 20) {
      res.status(400).json({
        errors: [{ message: 'GraphQL batch exceeds 20 operations' }],
      });
      return;
    }

    try {
      const contextValue = await createContext({ req, res });
      const results = await Promise.all(
        operations.map(async (operation) => {
          if (!operation?.query || typeof operation.query !== 'string') {
            return {
              errors: [{ message: 'Invalid GraphQL operation in batch' }],
            };
          }
          const result = await server.executeOperation(
            {
              query: operation.query,
              variables: operation.variables,
              operationName: operation.operationName,
              extensions: operation.extensions,
            },
            { contextValue },
          );
          if (result.body.kind === 'single') {
            return result.body.singleResult;
          }
          return {
            errors: [
              {
                message: 'Incremental delivery is not supported in GraphQL batches',
              },
            ],
          };
        }),
      );
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  };
}
