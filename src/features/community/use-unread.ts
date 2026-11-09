import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/src/features/auth/auth-provider';
import { communityApi } from './api';

export function useUnread() {
  const { status } = useAuth();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const query = useQuery({
    queryKey: ['community', 'unread'],
    queryFn: communityApi.unread,
    enabled: status === 'authenticated' && active,
    refetchInterval: active ? 30000 : false,
    retry: 1,
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return query;
}
