'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

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
        loyaltyPoints
      }
    }
  }
`;

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        loyaltyPoints
      }
    }
  }
`;

const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
        role
        loyaltyPoints
      }
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
    }
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
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);
  const [googleLoginMutation] = useMutation(LOGIN_WITH_GOOGLE);
  const [registerMutation] = useMutation(REGISTER);

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
    phone: string;
  }) => {
    const result = await registerMutation({ variables: { input } });
    const data = result.data as any;
    persist(data.register.accessToken, data.register.refreshToken, data.register.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle: loginGoogle, register, logout, refreshMe }),
    [user, loading, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
