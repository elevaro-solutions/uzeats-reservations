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
  }
`;

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user { ${USER_FIELDS} }
    }
  }
`;

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user { ${USER_FIELDS} }
    }
  }
`;

const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      accessToken
      refreshToken
      user { ${USER_FIELDS} }
    }
  }
`;

const ME = gql`
  query Me {
    me {
      id
      email
      phone
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
      }
    }
  }
`;

const LOGOUT = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);
  const [googleLoginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [registerMutation] = useMutation(REGISTER);
  const [logoutMutation] = useMutation(LOGOUT);

  const persist = (accessToken: string, refreshToken: string, nextUser: AuthUser) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(nextUser);
  };

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `query Me {
            me {
              id email phone firstName lastName role loyaltyPoints
              loyaltyCompletedVisits loyaltyTier loyaltyTierName
              loyaltyPointsExpireAt referralCode telegramChatId
              notificationPreferences { reservationUpdates { email webPush platform } }
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
    void refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string) => {
    const result = await loginMutation({ variables: { input: { email, password } } });
    const data = result.data as any;
    persist(data.login.accessToken, data.login.refreshToken, data.login.user);
  };

  const loginGoogle = async (idToken: string) => {
    const result = await googleLoginMutation({ variables: { idToken } });
    const data = result.data as any;
    persist(data.loginWithGoogle.accessToken, data.loginWithGoogle.refreshToken, data.loginWithGoogle.user);
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
    persist(data.register.accessToken, data.register.refreshToken, data.register.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await logoutMutation({ variables: { refreshToken: refreshToken || undefined } });
    } catch {
      // still clear the local session
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
