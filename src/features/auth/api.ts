import { apiRequest } from '@/src/lib/api-client';

import type { AuthTokenResponse, MessageResponse, UserResponse } from './types';

/** The emails carry a web link, so the pasted text may be that whole link instead of the token. */
export const tokenFrom = (pasted: string) => pasted.match(/[?&]token=([^&#\s]+)/)?.[1] ?? pasted.trim();

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body }),

  google: (idToken: string) =>
    apiRequest<AuthTokenResponse>('/auth/google', { method: 'POST', body: { idToken } }),

  verifyEmail: (pasted: string) =>
    apiRequest<MessageResponse>('/auth/verify-email', { method: 'POST', body: { token: tokenFrom(pasted) } }),

  resendVerification: (email: string) =>
    apiRequest<MessageResponse>('/auth/resend-verification', { method: 'POST', body: { email } }),

  register: (body: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    apiRequest<UserResponse>('/api/users/register', { method: 'POST', body }),

  logout: (refreshToken: string) =>
    apiRequest<MessageResponse>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  forgotPassword: (email: string) =>
    apiRequest<MessageResponse>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (body: { token: string; newPassword: string }) =>
    apiRequest<MessageResponse>('/auth/reset-password', { method: 'POST', body: { ...body, token: tokenFrom(body.token) } }),

  me: () => apiRequest<UserResponse>('/api/users/me', { auth: true }),
};
