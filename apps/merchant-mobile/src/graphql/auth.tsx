import { useApolloClient, useMutation } from "@apollo/client";
import { isPartnerMobileRole } from "@reservations/shared";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL } from "./config";
import { LOGIN, LOGOUT, REQUEST_PASSWORD_RESET } from "./operations";
import {
  refreshSessionTokens,
  TokenRefreshError,
} from "./token-refresh.helpers";

export type MobileUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: "diner" | "restaurant_owner" | "staff" | "admin" | "super_admin";
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  user: MobileUser | null;
  loading: boolean;
  /** Tokens exist but Me could not load (usually offline). Not signed out. */
  sessionOffline: boolean;
  login: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionInvalidatedListener = () => void;

const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>();

export function subscribeSessionInvalidated(
  listener: SessionInvalidatedListener,
) {
  sessionInvalidatedListeners.add(listener);
  return () => {
    sessionInvalidatedListeners.delete(listener);
  };
}

export function notifySessionInvalidated() {
  sessionInvalidatedListeners.forEach((listener) => listener());
}

export async function clearStoredTokens() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

async function persistSession(tokens: AuthTokens, user: MobileUser) {
  await SecureStore.setItemAsync("accessToken", tokens.accessToken);
  await SecureStore.setItemAsync("refreshToken", tokens.refreshToken);
  return user;
}

const PARTNER_ONLY_MESSAGE =
  "Partner accounts only. Sign in with a restaurant owner or staff account.";

function assertPartnerUser(user: MobileUser): MobileUser {
  if (!isPartnerMobileRole(user.role)) {
    throw new Error(PARTNER_ONLY_MESSAGE);
  }
  return user;
}

const ME_QUERY = `query Me {
  me {
    id email phone firstName lastName role
  }
}`;

async function fetchMe(accessToken: string): Promise<MobileUser | null> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: ME_QUERY }),
  });
  if (!res.ok) {
    throw new Error(`Me query failed with HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json.data?.me as MobileUser | null | undefined) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionOffline, setSessionOffline] = useState(false);
  const [loginMutation] = useMutation(LOGIN);
  const [requestPasswordResetMutation] = useMutation(REQUEST_PASSWORD_RESET);
  const [logoutMutation] = useMutation(LOGOUT);

  useEffect(() => {
    return subscribeSessionInvalidated(() => {
      setUser(null);
      setSessionOffline(false);
      void apolloClient.clearStore().catch(() => undefined);
    });
  }, [apolloClient]);

  const refreshMe = useCallback(async () => {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");

    if (!accessToken && !refreshToken) {
      setUser(null);
      setSessionOffline(false);
      setLoading(false);
      return;
    }

    try {
      let me: MobileUser | null = null;
      if (accessToken) {
        me = await fetchMe(accessToken);
      }

      if (!me) {
        if (!refreshToken) {
          await clearStoredTokens();
          setUser(null);
          setSessionOffline(false);
          return;
        }

        try {
          const tokens = await refreshSessionTokens();
          me = await fetchMe(tokens.accessToken);
        } catch (error) {
          if (error instanceof TokenRefreshError && error.reason === "network") {
            setSessionOffline(true);
            return;
          }
          await clearStoredTokens();
          setUser(null);
          setSessionOffline(false);
          return;
        }
      }

      if (!me) {
        await clearStoredTokens();
        setUser(null);
        setSessionOffline(false);
        return;
      }

      if (!isPartnerMobileRole(me.role)) {
        await clearStoredTokens();
        setUser(null);
        setSessionOffline(false);
        return;
      }

      setUser(me);
      setSessionOffline(false);
    } catch {
      setSessionOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await loginMutation({
        variables: { input: { email, password } },
      });
      const payload = data.login;
      try {
        const partner = assertPartnerUser(payload.user as MobileUser);
        setSessionOffline(false);
        setUser(
          await persistSession(
            {
              accessToken: payload.accessToken,
              refreshToken: payload.refreshToken,
            },
            partner,
          ),
        );
      } catch (error) {
        await clearStoredTokens();
        setUser(null);
        throw error;
      }
    },
    [loginMutation],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      const { data } = await requestPasswordResetMutation({
        variables: { email, app: "dashboard" },
      });
      return data.requestPasswordReset as { success: boolean; message: string };
    },
    [requestPasswordResetMutation],
  );

  const logout = useCallback(async () => {
    const storedRefresh = await SecureStore.getItemAsync("refreshToken");

    try {
      await logoutMutation({
        variables: { refreshToken: storedRefresh ?? null },
      });
    } catch {
      // Best-effort server revoke; always clear local session.
    }

    await clearStoredTokens();

    try {
      await apolloClient.clearStore();
    } catch {
      // Cache clear is best-effort.
    }

    setSessionOffline(false);
    setUser(null);
  }, [apolloClient, logoutMutation]);

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionOffline,
      login,
      requestPasswordReset,
      logout,
      refreshMe,
    }),
    [
      user,
      loading,
      sessionOffline,
      login,
      requestPasswordReset,
      logout,
      refreshMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
