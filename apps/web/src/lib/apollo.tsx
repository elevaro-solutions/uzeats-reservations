'use client';

import { ApolloClient, InMemoryCache, Observable, from, CombinedGraphQLErrors } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { ApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { ConfigProvider, type ThemeConfig } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import { antdUsLocale, theme } from '@reservations/ui';
import { AuthProvider } from '@/lib/auth';

dayjs.locale('en');

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

const httpLink = new BatchHttpLink({
  uri: API_URI,
  credentials: 'include',
  batchMax: 10,
  batchInterval: 15,
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    'X-Client-App': 'web',
  },
}));

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
        forward(operation).subscribe(subscriber);
      });
    });
  }

  isRefreshing = true;

  return new Observable((subscriber) => {
    fetch(API_URI, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'web',
      },
      body: JSON.stringify({
        query: `mutation RefreshToken { refreshToken { accessToken user { id } } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.errors?.length || !result?.data?.refreshToken) {
          throw new Error('Refresh failed');
        }
        isRefreshing = false;
        resolvePendingRequests();
        forward(operation).subscribe(subscriber);
      })
      .catch(() => {
        isRefreshing = false;
        pendingRequests = [];
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
      <ConfigProvider locale={antdUsLocale} theme={theme as ThemeConfig}>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </ApolloProvider></div>
  );
}
