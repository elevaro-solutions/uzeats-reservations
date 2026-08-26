import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  from,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import * as SecureStore from "expo-secure-store";
import { ReactNode } from "react";

import { AuthProvider, clearStoredTokens, notifySessionInvalidated } from "./auth";
import { API_URL } from "./config";

export { API_URL };

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync("accessToken");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
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

  const authError = graphQLErrors.find(
    (e) => e.message === "Authentication required",
  );
  if (!authError) return;

  if (isRefreshing) {
    return new Observable((subscriber) => {
      pendingRequests.push(async () => {
        const token = await SecureStore.getItemAsync("accessToken");
        const oldContext = operation.getContext();
        operation.setContext({
          headers: {
            ...oldContext.headers,
            authorization: token ? `Bearer ${token}` : "",
          },
        });
        forward(operation).subscribe(subscriber);
      });
    });
  }

  isRefreshing = true;

  return new Observable((subscriber) => {
    (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation refreshToken($refreshToken: String!) {
              refreshToken(refreshToken: $refreshToken) {
                accessToken
                refreshToken
                user { id }
              }
            }`,
            variables: { refreshToken },
          }),
        });

        const result = await res.json();
        const data = result?.data?.refreshToken;
        if (!data?.accessToken) throw new Error("Refresh failed");

        await SecureStore.setItemAsync("accessToken", data.accessToken);
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
        isRefreshing = false;
        resolvePendingRequests();

        const oldContext = operation.getContext();
        operation.setContext({
          headers: {
            ...oldContext.headers,
            authorization: `Bearer ${data.accessToken}`,
          },
        });
        forward(operation).subscribe(subscriber);
      } catch {
        isRefreshing = false;
        pendingRequests = [];
        await clearStoredTokens();
        notifySessionInvalidated();
        subscriber.error(authError);
      }
    })();
  });
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>{children}</AuthProvider>
    </ApolloProvider>
  );
}
