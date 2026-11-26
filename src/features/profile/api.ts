import { apiRequest } from '@/src/lib/api-client';
import { imageUploadForm } from '@/src/lib/image-upload-form';
import type { UserResponse } from '@/src/features/auth/types';

export type LearnerProfile = {
  userId: string;
  displayName: string;
  avatarReference: string | null;
  bio: string | null;
  selfReportedBand: number | null;
  timezone: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | string;
  createdAt: string;
  updatedAt: string;
};

export type LearnerProfileDraft = Pick<
  LearnerProfile,
  'displayName' | 'bio' | 'selfReportedBand' | 'timezone' | 'visibility'
>;

export const profileQueryKeys = {
  user: ['auth', 'me'] as const,
  learner: ['profile', 'learner'] as const,
  oauth: ['profile', 'oauth'] as const,
  sessions: ['profile', 'sessions'] as const,
};

export type OAuthIdentity = { id: string; provider: string; linkedAt?: string };

/** One signed-in device. The server masks the end of the address. */
export type DeviceSession = {
  sessionId: string;
  startedAt: string;
  lastUsedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
};

export const profileApi = {
  getSessions: () => apiRequest<DeviceSession[]>('/api/users/me/sessions', { auth: true }),
  revokeSession: (sessionId: string) => apiRequest<void>(`/api/users/me/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', auth: true }),
  revokeOtherSessions: () => apiRequest<void>('/api/users/me/sessions?exceptCurrent=true', { method: 'DELETE', auth: true }),

  /** Proves it is the account owner; the token works once, for five minutes, in this session. */
  reauthenticate: (credential: { googleIdToken: string } | { currentPassword: string }) =>
    apiRequest<{ reauthToken: string; expiresInSeconds: number; method: 'PASSWORD' | 'GOOGLE' }>('/api/users/me/reauth', { method: 'POST', body: credential, auth: true }),
  setInitialPassword: (newPassword: string, reauthToken: string) =>
    apiRequest<void>('/api/users/me/password/initial', { method: 'POST', body: { newPassword }, auth: true, headers: { 'X-Reauth-Token': reauthToken } }),

  /** Sign-in providers linked to the account (Google). */
  getOAuthIdentities: () => apiRequest<OAuthIdentity[]>('/api/users/me/oauth', { auth: true }),
  unlinkOAuthIdentity: (provider: string, reauthToken?: string) => apiRequest<void>(`/api/users/me/oauth/${encodeURIComponent(provider)}`, {
    method: 'DELETE', auth: true, ...(reauthToken ? { headers: { 'X-Reauth-Token': reauthToken } } : {}),
  }),

  getLearnerProfile: () => apiRequest<LearnerProfile>('/api/users/me/profile', { auth: true }),

  updateAccount: (body: { fullName: string; phoneNumber: string | null }) =>
    apiRequest<UserResponse>('/api/users/me', { method: 'PUT', body, auth: true }),

  updateLearnerProfile: (body: LearnerProfileDraft) =>
    apiRequest<LearnerProfile>('/api/users/me/profile', { method: 'PUT', body, auth: true }),

  uploadAvatar: async (file: { uri: string; name: string; type: string }) => {
    const form = await imageUploadForm(file);
    return apiRequest<LearnerProfile>('/api/users/me/avatar', { method: 'POST', body: form, auth: true });
  },

  deleteAvatar: () =>
    apiRequest<LearnerProfile>('/api/users/me/avatar', { method: 'DELETE', auth: true }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<void>('/api/users/me/password', { method: 'POST', body, auth: true }),
};
