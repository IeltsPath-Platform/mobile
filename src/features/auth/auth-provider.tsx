import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { onSessionExpired } from '@/src/lib/api-client';
import { AUTH_ENABLED } from '@/src/lib/env';
import { tokenStorage } from '@/src/lib/token-storage';

import { authApi } from './api';
import type { LoginInput, RegisterInput } from './schemas';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  authEnabled: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const currentUserQueryKey = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(AUTH_ENABLED ? 'loading' : 'unauthenticated');

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    let active = true;
    tokenStorage
      .load()
      .catch(() => null)
      .then((tokens) => {
        if (active) setStatus(tokens ? 'authenticated' : 'unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    onSessionExpired(() => {
      queryClient.clear();
      setStatus('unauthenticated');
    });
    return () => onSessionExpired(null);
  }, [queryClient]);

  const signIn = useCallback(
    async ({ email, password }: LoginInput) => {
      if (!AUTH_ENABLED) return;
      const tokens = await authApi.login({ email: email.trim(), password });
      await tokenStorage.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      queryClient.clear();
      setStatus('authenticated');
    },
    [queryClient],
  );

  const signUp = useCallback(
    async ({ fullName, email, phoneNumber, password }: RegisterInput) => {
      if (!AUTH_ENABLED) return;
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      await signIn({ email, password });
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    if (!AUTH_ENABLED) return;
    const tokens = await tokenStorage.load().catch(() => null);
    if (tokens) {
      // Best effort: the local session is cleared even if the server is unreachable.
      await authApi.logout(tokens.refreshToken).catch(() => undefined);
    }
    await tokenStorage.clear();
    queryClient.clear();
    setStatus('unauthenticated');
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, authEnabled: AUTH_ENABLED, signIn, signUp, signOut }),
    [status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useCurrentUser() {
  const { status, authEnabled } = useAuth();
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: authApi.me,
    enabled: authEnabled && status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}
