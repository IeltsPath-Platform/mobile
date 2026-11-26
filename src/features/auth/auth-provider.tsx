import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { onSessionExpired } from '@/src/lib/api-client';
import { AUTH_ENABLED } from '@/src/lib/env';
import { tokenStorage } from '@/src/lib/token-storage';
import * as Notifications from 'expo-notifications';
import { signOutGoogle } from './google';
import { registerCurrentInstallation, unregisterCurrentInstallation } from '@/src/features/community/push-notifications';

import { authApi } from './api';
import { adoptSessionOwner, clearUserData } from './clear-user-data';
import type { LoginInput, RegisterInput } from './schemas';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  authEnabled: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
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
      void queryClient.cancelQueries();
      queryClient.clear();
      setStatus('unauthenticated');
    });
    return () => onSessionExpired(null);
  }, [queryClient]);

  useEffect(() => {
    if (!AUTH_ENABLED || status !== 'authenticated') return;
    // Permission and native token registration are best effort; inbox notifications remain available without push.
    void registerCurrentInstallation().catch(() => undefined);
    // Expo Go on Android throws here (remote push was removed from it); push is optional, so run without it.
    let tokenSubscription: ReturnType<typeof Notifications.addPushTokenListener> | null = null;
    try {
      tokenSubscription = Notifications.addPushTokenListener((token) => {
        void registerCurrentInstallation(token.data).catch(() => undefined);
      });
    } catch {
      tokenSubscription = null;
    }
    return () => tokenSubscription?.remove();
  }, [status]);

  const startSession = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }) => {
      await tokenStorage.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      // Work left on the device by another account (drafts, recordings) must not reach this learner.
      await adoptSessionOwner(tokens.accessToken);
      void queryClient.cancelQueries();
      queryClient.clear();
      setStatus('authenticated');
    },
    [queryClient],
  );

  const signIn = useCallback(
    async ({ email, password }: LoginInput) => {
      if (!AUTH_ENABLED) return;
      await startSession(await authApi.login({ email: email.trim(), password }));
    },
    [startSession],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      if (!AUTH_ENABLED) return;
      await startSession(await authApi.google(idToken));
    },
    [startSession],
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
      try {
        await signIn({ email, password });
      } catch {
        // The account exists now; a retried registration would only hit "email already used".
        throw new Error('Tạo tài khoản thành công nhưng chưa đăng nhập được. Hãy đăng nhập bằng email vừa đăng ký.');
      }
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    if (!AUTH_ENABLED) return;
    const tokens = await tokenStorage.load().catch(() => null);
    // Best effort and capped: the device binding needs the access token, so this runs before the
    // local session is cleared, but an unreachable server must not hold the user on this screen.
    const serverCleanup = Promise.allSettled([
      unregisterCurrentInstallation(),
      tokens ? authApi.logout(tokens.refreshToken) : Promise.resolve(),
    ]);
    await Promise.race([serverCleanup, new Promise((resolve) => setTimeout(resolve, 3_000))]);
    await tokenStorage.clear();
    // Signing out hands the phone over: the learner's drafts, answers and recordings go with the session.
    await clearUserData();
    void signOutGoogle();
    void queryClient.cancelQueries();
    queryClient.clear();
    setStatus('unauthenticated');
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, authEnabled: AUTH_ENABLED, signIn, signInWithGoogle, signUp, signOut }),
    [status, signIn, signInWithGoogle, signUp, signOut],
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
