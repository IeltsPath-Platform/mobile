import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-image-manipulator', () => ({ manipulateAsync: vi.fn(), SaveFormat: { JPEG: 'jpeg' } }));
vi.mock('expo-file-system', () => ({ File: class {} }));

import { isDeleteConfirmed } from '@/src/features/profile/account-deletion';
import { profileApi } from '@/src/features/profile/api';

describe('account deletion', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(undefined);
  });

  it('accepts the confirmation word in any case, around spaces', () => {
    expect(isDeleteConfirmed('XÓA')).toBe(true);
    expect(isDeleteConfirmed('  xóa ')).toBe(true);
    expect(isDeleteConfirmed('XOA')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
  });

  it('sends the current password to DELETE /api/users/me', async () => {
    await profileApi.deleteAccount({ currentPassword: 'secret-1' });
    expect(apiRequestMock).toHaveBeenCalledWith('/api/users/me', { method: 'DELETE', body: { currentPassword: 'secret-1' }, auth: true });
  });

  it('sends a Google ID token for a Google-only account', async () => {
    await profileApi.deleteAccount({ googleIdToken: 'id-token' });
    expect(apiRequestMock).toHaveBeenCalledWith('/api/users/me', { method: 'DELETE', body: { googleIdToken: 'id-token' }, auth: true });
  });
});
