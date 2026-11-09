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
};

export const profileApi = {
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
