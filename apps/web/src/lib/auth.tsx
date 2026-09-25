'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { getDashboardUrl } from '@/lib/urls';

const USER_FIELDS = `
  id
  email
  firstName
  lastName
  role
  loyaltyPoints
  loyaltyCompletedVisits
  loyaltyTier
  loyaltyTierName
  loyaltyPointsExpireAt
  referralCode
  telegramChatId
  notificationPreferences {
    reservationUpdates { sms email webPush platform }
    waitlistAvailable { sms email webPush platform }
    availabilityAlerts { sms email webPush platform }
  }
`;

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user { ${USER_FIELDS} }
    }
  }
`;

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      user { ${USER_FIELDS} }
    }
  }
`;

const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      user { ${USER_FIELDS} }
    }
  }
`;

const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

const END_IMPERSONATION = gql`
  mutation EndImpersonation {
    endImpersonation
  }
`;

export type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints: number;
  loyaltyCompletedVisits?: number;
  loyaltyTier?: string;
  loyaltyTierName?: string;
  loyaltyPointsExpireAt?: string | null;
  referralCode?: string | null;
  telegramChatId?: string | null;
  notificationPreferences?: {
    reservationUpdates?: { sms?: boolean; email?: boolean; webPush?: boolean; platform?: boolean };
    waitlistAvailable?: { sms?: boolean; email?: boolean; webPush?: boolean; platform?: boolean };
    availabilityAlerts?: { sms?: boolean; email?: boolean; webPush?: boolean; platform?: boolean };
  };
};

type Impersonator = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

/** Restaurant partners belong on the dashboard, not the diner web app. */
export function sendNonDinerToDashboard(role: string): boolean {
  if (role === 'diner') return false;
  window.location.replace(getDashboardUrl());
  return true;
}

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonator: Impersonator | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void | Promise<void>;
  endImpersonation: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [impersonator, setImpersonator] = useState<Impersonator | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);
  const [googleLoginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [registerMutation] = useMutation(REGISTER);
  const [logoutMutation] = useMutation(LOGOUT);
  const [endImpersonationMutation] = useMutation(END_IMPERSONATION);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch(API_URI, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-App': 'web',
        },
        body: JSON.stringify({
          query: `query SessionInfo {
            session {
              isImpersonating
              user {
                id email phone firstName lastName role loyaltyPoints
                loyaltyCompletedVisits loyaltyTier loyaltyTierName
                loyaltyPointsExpireAt referralCode telegramChatId
                notificationPreferences {
                  reservationUpdates { sms email webPush platform }
                  waitlistAvailable { sms email webPush platform }
                  availabilityAlerts { sms email webPush platform }
                }
              }
              impersonator { id firstName lastName email }
            }
          }`,
        }),
      });
      const json = await res.json();
      const session = json.data?.session;
      const nextUser = (session?.user ?? null) as AuthUser | null;
      setUser(nextUser);
      setImpersonator(session?.impersonator ?? null);
      // Don't bounce admins who are impersonating a diner back to the dashboard.
      if (nextUser && !session?.isImpersonating) {
        sendNonDinerToDashboard(nextUser.role);
      }
    } catch {
      setUser(null);
      setImpersonator(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Migrate away from legacy localStorage tokens.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    void refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string) => {
    const result = await loginMutation({ variables: { input: { email, password } } });
    const nextUser = (result.data as { login: { user: AuthUser } }).login.user;
    setUser(nextUser);
    setImpersonator(null);
    sendNonDinerToDashboard(nextUser.role);
    return nextUser;
  };

  const loginGoogle = async (idToken: string) => {
    const result = await googleLoginMutation({ variables: { idToken } });
    const nextUser = (result.data as { loginWithGoogle: { user: AuthUser } }).loginWithGoogle.user;
    setUser(nextUser);
    setImpersonator(null);
    sendNonDinerToDashboard(nextUser.role);
    return nextUser;
  };

  const register = async (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
  }) => {
    const result = await registerMutation({ variables: { input } });
    const data = result.data as any;
    setUser(data.register.user);
    setImpersonator(null);
  };

  const logout = async () => {
    try {
      await logoutMutation();
    } catch {
      // still clear the local session
    }
    setUser(null);
    setImpersonator(null);
    window.location.assign('/login');
  };

  const endImpersonation = () => {
    void (async () => {
      try {
        await endImpersonationMutation();
      } catch {
        // still leave the diner session
      }
      window.location.href = getDashboardUrl();
    })();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isImpersonating: Boolean(impersonator),
      impersonator,
      login,
      loginWithGoogle: loginGoogle,
      register,
      logout,
      endImpersonation,
      refreshMe,
    }),
    [user, loading, impersonator, refreshMe],
  );

  return <div component="AuthProvider" style={{ display: 'contents' }}><AuthContext.Provider value={value}>{children}</AuthContext.Provider></div>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
