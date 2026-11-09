import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/features/auth/auth-provider';
import { gamificationApi } from '@/src/features/progress/gamification-api';
import type { PageResponse } from '@/src/features/vocab/api';

export function nextPage<T>(last: PageResponse<T>, pages: PageResponse<T>[]) {
  return last.items.length && pages.reduce((count, page) => count + page.items.length, 0) < last.total ? last.page + 1 : undefined;
}

export function invalidateFlashcards(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['flashcards'] }),
    client.invalidateQueries({ queryKey: ['vocab', 'achievements'] }),
  ]);
}

export function useDebouncedSearch(value: string) {
  const [debounced, setDebounced] = useState(value.trim());
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useFlashcardAccess() {
  const { authEnabled, status } = useAuth();
  return authEnabled && status === 'authenticated';
}

export function useStudyTimezone() {
  const enabled = useFlashcardAccess();
  const settings = useQuery({ queryKey: ['gamification', 'settings'], queryFn: gamificationApi.settings, enabled, staleTime: 300_000 });
  return settings.data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Ho_Chi_Minh';
}
