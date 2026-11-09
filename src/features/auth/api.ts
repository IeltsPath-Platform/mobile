import { apiRequest } from '@/src/lib/api-client';

import type { AuthTokenResponse, MessageResponse, UserResponse } from './types';

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body }),

  register: (body: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    apiRequest<UserResponse>('/api/users/register', { method: 'POST', body }),

  logout: (refreshToken: string) =>
    apiRequest<MessageResponse>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  forgotPassword: (email: string) =>
    apiRequest<MessageResponse>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (body: { token: string; newPassword: string }) =>
    apiRequest<MessageResponse>('/auth/reset-password', { method: 'POST', body }),

  me: () => apiRequest<UserResponse>('/api/users/me', { auth: true }),
};
