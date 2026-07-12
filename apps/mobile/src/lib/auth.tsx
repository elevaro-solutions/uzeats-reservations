import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
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
        loyaltyPoints
      }
    }
  }
`;

export type MobileUser = {
  id: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  role: 'diner' | 'restaurant_owner' | 'staff' | 'admin';
  loyaltyPoints: number;
};

const AuthContext = createContext<{
  user: MobileUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN);

  const refreshMe = useCallback(async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `query Me { me { id email firstName lastName role loyaltyPoints } }`,
          }),
        },
      );
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
    await SecureStore.setItemAsync('accessToken', data.login.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.login.refreshToken);
    setUser(data.login.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
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
