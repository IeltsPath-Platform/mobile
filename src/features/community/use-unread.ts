import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/src/features/auth/auth-provider';
import { communityApi } from './api';
import { shouldPollUnread, UNREAD_POLL_MS } from './unread-polling';

export const unreadQueryKey = ['community', 'unread'] as const;

export function useUnread() {
  const { status } = useAuth();
  const pathname = usePathname();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const poll = shouldPollUnread({ authenticated: status === 'authenticated', appActive: active, pathname });
  const query = useQuery({
    queryKey: unreadQueryKey,
    queryFn: communityApi.unread,
    enabled: poll,
    refetchInterval: poll ? UNREAD_POLL_MS : false,
    retry: 1,
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return query;
}
