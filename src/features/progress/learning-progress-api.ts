import { useQuery, type QueryClient } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/auth-provider';
import { apiRequest } from '@/src/lib/api-client';

/**
 * Streak and XP of the learning service, the same numbers the web overview and profile show. Practice tests,
 * lessons and knowledge practice feed them on the server after a submission; the app only reads them.
 */
export type LearningStreak = {
  currentDays: number;
  longestDays: number;
  activeToday: boolean;
  freezeAvailable: boolean;
  /** Points the next freeze costs. */
  nextFreezeCost: number;
  lostStreakDays: number;
  /** yyyy-mm-dd days of the latest run a freeze covered, oldest first. */
  frozenDays: string[];
};

export type LearningProgress = {
  totalXp: number;
  level: number;
  nextLevelAt: number;
  xpToNextLevel: number;
  xpToday: number;
  dailyCap: number;
};

export const learningProgressKeys = {
  all: ['learning-progress'] as const,
  streak: ['learning-progress', 'streak'] as const,
  progress: ['learning-progress', 'xp'] as const,
};

export const learningProgressApi = {
  streak: (signal?: AbortSignal) => apiRequest<LearningStreak>('/api/learning/me/streak', { auth: true, signal }),
  progress: (signal?: AbortSignal) => apiRequest<LearningProgress>('/api/learning/me/progress', { auth: true, signal }),
  /** Buys a streak freeze with points; the same requestId is charged once. */
  buyFreeze: (requestId: string) => apiRequest<LearningStreak>('/api/learning/me/streak/freeze', { method: 'POST', body: { requestId }, auth: true }),
};

/**
 * After a submission the server updates the streak from a queued event, a moment later. Reads it now and once more
 * a few seconds on, so the home and profile catch the new day without a manual refresh.
 */
export function refreshLearningProgressSoon(client: QueryClient) {
  void client.invalidateQueries({ queryKey: learningProgressKeys.all });
  setTimeout(() => { void client.invalidateQueries({ queryKey: learningProgressKeys.all }); }, 4000);
}

/** Streak and XP of the signed-in learner. */
export function useLearningProgress() {
  const { authEnabled, status } = useAuth();
  const enabled = authEnabled && status === 'authenticated';
  const streak = useQuery({ queryKey: learningProgressKeys.streak, queryFn: ({ signal }) => learningProgressApi.streak(signal), enabled, staleTime: 30_000, retry: 1 });
  const progress = useQuery({ queryKey: learningProgressKeys.progress, queryFn: ({ signal }) => learningProgressApi.progress(signal), enabled, staleTime: 30_000, retry: 1 });
  return { enabled, streak, progress };
}
