'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';

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

const AuthContext = createContext<{
  user: DashUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('dashAccessToken');
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
          query: `query Me { me { id email firstName lastName role restaurantIds } }`,
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
    const { data } = await loginMutation({ variables: { input: { email, password } } });
    localStorage.setItem('dashAccessToken', data.login.accessToken);
    localStorage.setItem('dashRefreshToken', data.login.refreshToken);
    setUser(data.login.user);
  };

  const logout = () => {
    localStorage.removeItem('dashAccessToken');
    localStorage.removeItem('dashRefreshToken');
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth required');
  return ctx;
}
