import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/auth-provider';
import { learnerStats } from '@/src/features/practice/path';

import { streakApi } from './streak-api';

/** Live streak when auth on; otherwise mock learnerStats. */
export function useStreak() {
  const { authEnabled, status } = useAuth();
  const enabled = authEnabled && status === 'authenticated';

  const query = useQuery({
    queryKey: ['streak'],
    queryFn: streakApi.get,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const currentDays = enabled && query.data ? query.data.currentDays : learnerStats.streak;
  const longestDays = enabled && query.data ? query.data.longestDays : learnerStats.streak;
  const isMock = !enabled || Boolean(query.error);

  return {
    currentDays,
    longestDays,
    isMock,
    isPending: enabled && query.isPending,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    error: query.error,
  };
}
