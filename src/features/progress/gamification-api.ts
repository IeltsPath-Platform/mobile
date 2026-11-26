import { apiRequest } from '@/src/lib/api-client';

export type GamificationSettings = { timezone: string };

export const gamificationApi = {
  settings: () => apiRequest<GamificationSettings>('/api/learning/me/settings', { auth: true }),
  updateSettings: (timezone: string) => apiRequest<GamificationSettings>('/api/learning/me/settings', {
    method: 'PUT',
    body: { timezone },
    auth: true,
  }),
};
