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
import { StripeProvider } from "@stripe/stripe-react-native";
import * as SecureStore from "expo-secure-store";
import { ReactNode } from "react";

import { AuthProvider, clearStoredTokens, notifySessionInvalidated } from "./auth";
import { API_URL } from "./config";
import {
  isUnauthenticatedGraphQLError,
  refreshSessionTokens,
} from "./token-refresh.helpers";

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

type PendingRequest = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

function resolvePendingRequests() {
  pendingRequests.forEach(({ resolve }) => resolve());
  pendingRequests = [];
}

function rejectPendingRequests(error: unknown) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
}

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors?.length) return;

  const authError = graphQLErrors.find(isUnauthenticatedGraphQLError);
  if (!authError) return;

  if (isRefreshing) {
    return new Observable((subscriber) => {
      pendingRequests.push({
        resolve: () => {
          void (async () => {
            try {
              const token = await SecureStore.getItemAsync("accessToken");
              const oldContext = operation.getContext();
              operation.setContext({
                headers: {
                  ...oldContext.headers,
                  authorization: token ? `Bearer ${token}` : "",
                },
              });
              forward(operation).subscribe(subscriber);
            } catch (error) {
              subscriber.error(error);
            }
          })();
        },
        reject: (error) => {
          subscriber.error(error);
        },
      });
    });
  }

  isRefreshing = true;

  return new Observable((subscriber) => {
    (async () => {
      try {
        const tokens = await refreshSessionTokens();
        isRefreshing = false;
        resolvePendingRequests();

        const oldContext = operation.getContext();
        operation.setContext({
          headers: {
            ...oldContext.headers,
            authorization: `Bearer ${tokens.accessToken}`,
          },
        });
        forward(operation).subscribe(subscriber);
      } catch (error) {
        isRefreshing = false;
        rejectPendingRequests(error);
        await clearStoredTokens();
        notifySessionInvalidated();
        subscriber.error(authError);
      }
    })();
  });
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Address has no id; merge partial selections (e.g. SEARCH vs MY_RESERVATIONS)
      Address: {
        merge: true,
      },
      Query: {
        fields: {
          bookableTables: {
            keyArgs: ["restaurantId", "slotStart", "partySize"],
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      urlScheme="tablevera"
    >
      <ApolloProvider client={apolloClient}>
        <AuthProvider>{children}</AuthProvider>
      </ApolloProvider>
    </StripeProvider>
  );
}
