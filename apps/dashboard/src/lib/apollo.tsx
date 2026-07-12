'use client';

import '@ant-design/v5-patch-for-react-19';
import { ApolloClient, InMemoryCache, createHttpLink, ApolloProvider, Observable, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { ConfigProvider } from 'antd';
import { theme } from '@reservations/ui';
import { AuthProvider } from '@/lib/auth';

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

const httpLink = createHttpLink({ uri: API_URI });

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dashAccessToken') : null;
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
      pendingRequests.push(() => {
        const token = localStorage.getItem('dashAccessToken');
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
    const refreshToken = localStorage.getItem('dashRefreshToken');
    if (!refreshToken) {
      localStorage.removeItem('dashAccessToken');
      localStorage.removeItem('dashRefreshToken');
      window.location.href = '/login';
      subscriber.error(authError);
      return;
    }

    fetch(API_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation refreshToken($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken refreshToken user { id } } }`,
        variables: { refreshToken },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        const data = result?.data?.refreshToken;
        if (!data?.accessToken) throw new Error('Refresh failed');

        localStorage.setItem('dashAccessToken', data.accessToken);
        localStorage.setItem('dashRefreshToken', data.refreshToken);
        isRefreshing = false;
        resolvePendingRequests();

        const oldContext = operation.getContext();
        operation.setContext({
          headers: { ...oldContext.headers, authorization: `Bearer ${data.accessToken}` },
        });
        forward(operation).subscribe(subscriber);
      })
      .catch(() => {
        isRefreshing = false;
        pendingRequests = [];
        localStorage.removeItem('dashAccessToken');
        localStorage.removeItem('dashRefreshToken');
        window.location.href = '/login';
        subscriber.error(authError);
      });
  });
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <ConfigProvider theme={theme}>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </ApolloProvider>
  );
}
