'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@/lib/apollo-hooks';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        restaurantIds
      }
    }
  }
`;

export type DashUser = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: string;
  restaurantIds: string[];
};

type Impersonator = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

const AuthContext = createContext<{
  user: DashUser | null;
  loading: boolean;
  impersonator: Impersonator | null;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, user: DashUser) => void;
  beginImpersonation: (accessToken: string, user: DashUser, impersonator: Impersonator) => void;
  endImpersonation: () => void;
  logout: () => void;
} | null>(null);

const ADMIN_BACKUP_ACCESS = 'dashAdminAccessToken';
const ADMIN_BACKUP_REFRESH = 'dashAdminRefreshToken';
const ADMIN_BACKUP_USER = 'dashAdminUser';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(null);
  const [impersonator, setImpersonator] = useState<Impersonator | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('dashAccessToken');
    if (!token) {
      setUser(null);
      setImpersonator(null);
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
          query: `query SessionInfo {
            session {
              isImpersonating
              user { id email firstName lastName role restaurantIds }
              impersonator { id firstName lastName email }
            }
          }`,
        }),
      });
      const json = await res.json();
      const session = json.data?.session;
      setUser(session?.user ?? null);
      setImpersonator(session?.impersonator ?? null);
    } catch {
      setUser(null);
      setImpersonator(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const setSession = (accessToken: string, refreshToken: string, nextUser: DashUser) => {
    localStorage.setItem('dashAccessToken', accessToken);
    localStorage.setItem('dashRefreshToken', refreshToken);
    setUser(nextUser);
    setImpersonator(null);
  };

  const beginImpersonation = (
    accessToken: string,
    nextUser: DashUser,
    nextImpersonator: Impersonator,
  ) => {
    const currentAccess = localStorage.getItem('dashAccessToken');
    const currentRefresh = localStorage.getItem('dashRefreshToken');
    if (currentAccess && user && user.role === 'admin') {
      localStorage.setItem(ADMIN_BACKUP_ACCESS, currentAccess);
      if (currentRefresh) localStorage.setItem(ADMIN_BACKUP_REFRESH, currentRefresh);
      localStorage.setItem(ADMIN_BACKUP_USER, JSON.stringify(user));
    }
    localStorage.setItem('dashAccessToken', accessToken);
    localStorage.removeItem('dashRefreshToken');
    setUser(nextUser);
    setImpersonator(nextImpersonator);
  };

  const endImpersonation = () => {
    const access = localStorage.getItem(ADMIN_BACKUP_ACCESS);
    const refresh = localStorage.getItem(ADMIN_BACKUP_REFRESH);
    const rawUser = localStorage.getItem(ADMIN_BACKUP_USER);
    localStorage.removeItem(ADMIN_BACKUP_ACCESS);
    localStorage.removeItem(ADMIN_BACKUP_REFRESH);
    localStorage.removeItem(ADMIN_BACKUP_USER);
    if (access && rawUser) {
      localStorage.setItem('dashAccessToken', access);
      if (refresh) localStorage.setItem('dashRefreshToken', refresh);
      setUser(JSON.parse(rawUser) as DashUser);
      setImpersonator(null);
      window.location.href = '/admin/users';
      return;
    }
    localStorage.removeItem('dashAccessToken');
    localStorage.removeItem('dashRefreshToken');
    setUser(null);
    setImpersonator(null);
    window.location.href = '/login';
  };

  const login = async (email: string, password: string) => {
    const { data } = await loginMutation({ variables: { input: { email, password } } });
    const nextUser = data.login.user as DashUser;
    if (nextUser.role === 'diner') {
      throw new Error(
        'This hub is for restaurant partners. Sign in on the diner app to manage your bookings.',
      );
    }
    setSession(data.login.accessToken, data.login.refreshToken, nextUser);
  };

  const logout = () => {
    localStorage.removeItem('dashAccessToken');
    localStorage.removeItem('dashRefreshToken');
    localStorage.removeItem(ADMIN_BACKUP_ACCESS);
    localStorage.removeItem(ADMIN_BACKUP_REFRESH);
    localStorage.removeItem(ADMIN_BACKUP_USER);
    setUser(null);
    setImpersonator(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      impersonator,
      isImpersonating: Boolean(impersonator),
      login,
      setSession,
      beginImpersonation,
      endImpersonation,
      logout,
    }),
    [user, loading, impersonator],
  );
  return <div component="AuthProvider" style={{ display: 'contents' }}><AuthContext.Provider value={value}>{children}</AuthContext.Provider></div>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth required');
  return ctx;
}
