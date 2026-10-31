import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/auth-provider';

import { streakApi } from './streak-api';

/** Missing or failed live data remains unavailable. */
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

  const currentDays = enabled && query.data ? query.data.currentDays : null;
  const longestDays = enabled && query.data ? query.data.longestDays : null;
  return {
    currentDays,
    longestDays,
    isPending: enabled && query.isPending,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    error: query.error,
  };
}
