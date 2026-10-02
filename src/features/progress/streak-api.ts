import { apiRequest } from '@/src/lib/api-client';

export type StreakResponse = {
  userId: string;
  currentDays: number;
  longestDays: number;
  lastQualifiedDate: string | null;
  timezone: string;
};

export const streakApi = {
  get: () => apiRequest<StreakResponse>('/api/learning-support/streak', { auth: true }),
};
