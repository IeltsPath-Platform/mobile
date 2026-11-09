import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useAuth, useCurrentUser } from '@/src/features/auth/auth-provider';

const progressKey = (userId: string, topicId: string) => `@ielts/vocab-lesson-progress/v1/${userId}/${topicId}`;

function parseCompletedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useTopicLessonProgress(topicId: string, lessonIds: string[]) {
  const { authEnabled, status } = useAuth();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const waitingForUser = authEnabled && status !== 'unauthenticated' && !user.data;
  const userId = user.data?.id ?? (waitingForUser ? 'loading' : 'guest');
  const queryKey = useMemo(() => ['vocab', 'lesson-progress', userId, topicId] as const, [topicId, userId]);
  const storageKey = progressKey(userId, topicId);
  const progress = useQuery({
    queryKey,
    queryFn: async () => parseCompletedIds(await AsyncStorage.getItem(storageKey)),
    enabled: Boolean(topicId) && !waitingForUser,
    staleTime: Infinity,
  });
  const completedIds = progress.data ?? [];
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const firstIncompleteIndex = lessonIds.findIndex((id) => !completed.has(id));
  const unlockedThrough = firstIncompleteIndex === -1 ? lessonIds.length : firstIncompleteIndex;
  const isUnlocked = useCallback((index: number) => index <= unlockedThrough, [unlockedThrough]);
  const markCompleted = useCallback(async (lessonId: string) => {
    const current = parseCompletedIds(await AsyncStorage.getItem(storageKey));
    if (current.includes(lessonId)) return;
    const next = [...current, lessonId];
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    queryClient.setQueryData<string[]>(queryKey, next);
  }, [queryClient, queryKey, storageKey]);

  return {
    completedCount: unlockedThrough,
    completedIds,
    isCompleted: (lessonId: string) => completed.has(lessonId),
    isUnlocked,
    isLoading: progress.isPending || waitingForUser,
    markCompleted,
  };
}
