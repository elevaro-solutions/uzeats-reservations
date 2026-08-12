'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

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
    reservationUpdates { email webPush platform }
    availabilityAlerts { email webPush platform }
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
    reservationUpdates?: { email?: boolean; webPush?: boolean; platform?: boolean };
    availabilityAlerts?: { email?: boolean; webPush?: boolean; platform?: boolean };
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void | Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);
  const [googleLoginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [registerMutation] = useMutation(REGISTER);
  const [logoutMutation] = useMutation(LOGOUT);

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
          query: `query Me {
            me {
              id email phone firstName lastName role loyaltyPoints
              loyaltyCompletedVisits loyaltyTier loyaltyTierName
              loyaltyPointsExpireAt referralCode telegramChatId
              notificationPreferences {
                reservationUpdates { email webPush platform }
                availabilityAlerts { email webPush platform }
              }
            }
          }`,
        }),
      });
      const json = await res.json();
      setUser(json.data?.me ?? null);
    } catch {
      setUser(null);
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
    const data = result.data as any;
    setUser(data.login.user);
  };

  const loginGoogle = async (idToken: string) => {
    const result = await googleLoginMutation({ variables: { idToken } });
    const data = result.data as any;
    setUser(data.loginWithGoogle.user);
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
  };

  const logout = async () => {
    try {
      await logoutMutation();
    } catch {
      // still clear the local session
    }
    setUser(null);
    window.location.assign('/login');
  };

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle: loginGoogle, register, logout, refreshMe }),
    [user, loading, refreshMe],
  );

  return <div component="AuthProvider" style={{ display: 'contents' }}><AuthContext.Provider value={value}>{children}</AuthContext.Provider></div>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
