import { useApolloClient, useMutation } from "@apollo/client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
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

import {
  configureGoogleSignIn,
  isGoogleSignInConfigured,
} from "@/features/auth/helpers/google-sign-in.helpers";

import { API_URL } from "./config";
import {
  LOGIN,
  LOGIN_WITH_GOOGLE,
  LOGOUT,
  REGISTER,
  REQUEST_PASSWORD_RESET,
} from "./operations";
import {
  refreshSessionTokens,
  TokenRefreshError,
} from "./token-refresh.helpers";

export type MobileUser = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: "diner" | "restaurant_owner" | "staff" | "admin";
  loyaltyPoints: number;
  loyaltyCompletedVisits?: number;
  loyaltyTier?: string;
  loyaltyTierName?: string;
  referralCode?: string | null;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  referralCode?: string;
};

type AuthContextValue = {
  user: MobileUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionInvalidatedListener = () => void;

const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>();

export function subscribeSessionInvalidated(listener: SessionInvalidatedListener) {
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

async function signOutGoogleBestEffort() {
  if (!isGoogleSignInConfigured()) return;
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Best-effort; local session clear must still complete.
  }
}

const ME_QUERY = `query Me {
  me {
    id email firstName lastName role loyaltyPoints
    loyaltyCompletedVisits loyaltyTier loyaltyTierName referralCode
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
  const [loginMutation] = useMutation(LOGIN);
  const [registerMutation] = useMutation(REGISTER);
  const [googleLoginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [requestPasswordResetMutation] = useMutation(REQUEST_PASSWORD_RESET);
  const [logoutMutation] = useMutation(LOGOUT);

  useEffect(() => {
    return subscribeSessionInvalidated(() => {
      setUser(null);
      void apolloClient.clearStore().catch(() => undefined);
    });
  }, [apolloClient]);

  const refreshMe = useCallback(async () => {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");

    if (!accessToken && !refreshToken) {
      setUser(null);
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
          return;
        }

        try {
          const tokens = await refreshSessionTokens();
          me = await fetchMe(tokens.accessToken);
        } catch (error) {
          if (error instanceof TokenRefreshError && error.reason === "network") {
            // Keep tokens; session can restore when connectivity returns.
            setUser(null);
            return;
          }
          await clearStoredTokens();
          setUser(null);
          return;
        }
      }

      if (!me) {
        await clearStoredTokens();
        setUser(null);
        return;
      }

      setUser(me);
    } catch {
      // Transient network / parse errors — do not wipe a still-valid refresh token.
      setUser(null);
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
      setUser(
        await persistSession(
          {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          },
          payload.user,
        ),
      );
    },
    [loginMutation],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await registerMutation({ variables: { input } });
      const payload = data.register;
      setUser(
        await persistSession(
          {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          },
          payload.user,
        ),
      );
    },
    [registerMutation],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const { data } = await googleLoginMutation({
        variables: { idToken },
      });
      const payload = data.loginWithGoogle;
      setUser(
        await persistSession(
          {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          },
          payload.user,
        ),
      );
    },
    [googleLoginMutation],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      const { data } = await requestPasswordResetMutation({
        variables: { email, app: "web" },
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

    await signOutGoogleBestEffort();
    await clearStoredTokens();

    try {
      await apolloClient.clearStore();
    } catch {
      // Cache clear is best-effort.
    }

    setUser(null);
  }, [apolloClient, logoutMutation]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      requestPasswordReset,
      logout,
      refreshMe,
    }),
    [
      user,
      loading,
      login,
      loginWithGoogle,
      register,
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
