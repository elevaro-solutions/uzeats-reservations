'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@/lib/apollo-hooks';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
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
  setSession: (user: DashUser) => void;
  beginImpersonation: (user: DashUser, impersonator: Impersonator) => void;
  endImpersonation: () => void;
  logout: () => void | Promise<void>;
} | null>(null);

const API_URI = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(null);
  const [impersonator, setImpersonator] = useState<Impersonator | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);
  const [logoutMutation] = useMutation(LOGOUT);
  const [endImpersonationMutation] = useMutation(END_IMPERSONATION);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch(API_URI, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-App': 'dashboard',
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
    localStorage.removeItem('dashAccessToken');
    localStorage.removeItem('dashRefreshToken');
    localStorage.removeItem('dashAdminAccessToken');
    localStorage.removeItem('dashAdminRefreshToken');
    localStorage.removeItem('dashAdminUser');
    void refreshMe();
  }, [refreshMe]);

  const setSession = (nextUser: DashUser) => {
    setUser(nextUser);
    setImpersonator(null);
  };

  const beginImpersonation = (nextUser: DashUser, nextImpersonator: Impersonator) => {
    // Cookies are swapped by the startImpersonation mutation response (Set-Cookie).
    setUser(nextUser);
    setImpersonator(nextImpersonator);
  };

  const endImpersonation = () => {
    void (async () => {
      try {
        const { data } = await endImpersonationMutation();
        if (!data?.endImpersonation) {
          window.location.href = '/login';
          return;
        }
        window.location.href = '/admin/users';
      } catch {
        window.location.href = '/login';
      }
    })();
  };

  const login = async (email: string, password: string) => {
    const { data } = await loginMutation({ variables: { input: { email, password } } });
    const nextUser = data.login.user as DashUser;
    if (nextUser.role === 'diner') {
      throw new Error(
        'This hub is for restaurant partners. Sign in on the diner app to manage your bookings.',
      );
    }
    setSession(nextUser);
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

  return (
    <div component="AuthProvider" style={{ display: 'contents' }}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </div>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
