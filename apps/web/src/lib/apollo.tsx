'use client';

import { ApolloClient, InMemoryCache, HttpLink, Observable, from, CombinedGraphQLErrors } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { ConfigProvider, type ThemeConfig } from 'antd';
import { theme } from '@reservations/ui';
import { AuthProvider } from '@/lib/auth';

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

const httpLink = new HttpLink({ uri: API_URI });

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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

const errorLink = onError(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) return;

  const authError = error.errors.find((e) => e.message === 'Authentication required');
  if (!authError) return;

  if (isRefreshing) {
    return new Observable((subscriber) => {
      pendingRequests.push(() => {
        const token = localStorage.getItem('accessToken');
        operation.setContext((prev) => ({
          headers: { ...prev.headers, authorization: token ? `Bearer ${token}` : '' },
        }));
        forward(operation).subscribe(subscriber);
      });
    });
  }

  isRefreshing = true;

  return new Observable((subscriber) => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      subscriber.error(error);
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

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        isRefreshing = false;
        resolvePendingRequests();

        operation.setContext((prev) => ({
          headers: { ...prev.headers, authorization: `Bearer ${data.accessToken}` },
        }));
        forward(operation).subscribe(subscriber);
      })
      .catch(() => {
        isRefreshing = false;
        pendingRequests = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        subscriber.error(error);
      });
  });
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div component="Providers" style={{ display: 'contents' }}><ApolloProvider client={client}>
      {/* shared theme is typed against antd v5; structurally compatible with v6 */}
      <ConfigProvider theme={theme as ThemeConfig}>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </ApolloProvider></div>
  );
}
