import { apiRequest } from '@/src/lib/api-client';

export type GamificationProgress = {
  totalXp: number;
  level: number;
  nextLevelAt: number;
  xpToNextLevel: number;
  xpToday: number;
  dailyCap: number;
};

export type GamificationSettings = { timezone: string };

export const gamificationApi = {
  progress: () => apiRequest<GamificationProgress>('/api/learning/me/progress', { auth: true }),
  settings: () => apiRequest<GamificationSettings>('/api/learning/me/settings', { auth: true }),
  updateSettings: (timezone: string) => apiRequest<GamificationSettings>('/api/learning/me/settings', {
    method: 'PUT',
    body: { timezone },
    auth: true,
  }),
};
