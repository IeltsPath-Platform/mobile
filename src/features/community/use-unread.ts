import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/src/features/auth/auth-provider';
import { communityApi } from './api';
import { shouldPollUnread, UNREAD_POLL_MS } from './unread-polling';

export const unreadQueryKey = ['community', 'unread'] as const;

/** Every observer of a query runs its own timer, so only the tab badge asks for `poll`; the others read its cache. */
export function useUnread({ polls = false }: { polls?: boolean } = {}) {
  const { status } = useAuth();
  const pathname = usePathname();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const poll = shouldPollUnread({ authenticated: status === 'authenticated', appActive: active, pathname });
  const query = useQuery({
    queryKey: unreadQueryKey,
    queryFn: communityApi.unread,
    enabled: poll,
    refetchInterval: polls && poll ? UNREAD_POLL_MS : false,
    retry: 1,
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return query;
}
