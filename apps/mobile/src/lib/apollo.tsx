import { ApolloClient, InMemoryCache, createHttpLink, ApolloProvider, Observable, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePendingRequests() {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
}

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors) return;

  const authError = graphQLErrors.find((e) => e.message === 'Authentication required');
  if (!authError) return;

  if (isRefreshing) {
    return new Observable((subscriber) => {
      pendingRequests.push(async () => {
        const token = await SecureStore.getItemAsync('accessToken');
        const oldContext = operation.getContext();
        operation.setContext({
          headers: { ...oldContext.headers, authorization: token ? `Bearer ${token}` : '' },
        });
        forward(operation).subscribe(subscriber);
      });
    });
  }

  isRefreshing = true;

  return new Observable((subscriber) => {
    (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation refreshToken($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken refreshToken user { id } } }`,
            variables: { refreshToken },
          }),
        });

        const result = await res.json();
        const data = result?.data?.refreshToken;
        if (!data?.accessToken) throw new Error('Refresh failed');

        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        isRefreshing = false;
        resolvePendingRequests();

        const oldContext = operation.getContext();
        operation.setContext({
          headers: { ...oldContext.headers, authorization: `Bearer ${data.accessToken}` },
        });
        forward(operation).subscribe(subscriber);
      } catch {
        isRefreshing = false;
        pendingRequests = [];
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        subscriber.error(authError);
      }
    })();
  });
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

// Apollo's types bind to the hoisted @types/react (19.2.x) while Expo pins
// ~19.0.x, making ApolloProvider "not a valid JSX element type". Re-typing it
// against the local React types sidesteps the duplicate-@types mismatch.
const Provider = ApolloProvider as unknown as React.FC<{
  client: typeof client;
  children: React.ReactNode;
}>;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
