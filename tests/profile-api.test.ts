import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { profileApi } from '@/src/features/profile/api';

class FormDataStub {
  readonly fields: unknown[][] = [];

  append(...values: unknown[]) {
    this.fields.push(values);
  }
}

describe('profileApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    vi.stubGlobal('FormData', FormDataStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and updates the account and learner profile through their own endpoints', async () => {
    const draft = {
      displayName: 'Linh',
      bio: 'Đang học IELTS',
      selfReportedBand: 6.5,
      timezone: 'Asia/Ho_Chi_Minh',
      visibility: 'PUBLIC' as const,
    };

    await profileApi.getLearnerProfile();
    await profileApi.updateAccount({ fullName: 'Linh Nguyen', phoneNumber: '0900000000' });
    await profileApi.updateLearnerProfile(draft);

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/users/me/profile', { auth: true });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/users/me', {
      method: 'PUT', body: { fullName: 'Linh Nguyen', phoneNumber: '0900000000' }, auth: true,
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(3, '/api/users/me/profile', {
      method: 'PUT', body: draft, auth: true,
    });
  });

  it('uploads and removes the avatar using the backend multipart contract', async () => {
    await profileApi.uploadAvatar({ uri: 'file:///avatar.png', name: 'avatar.png', type: 'image/png' });
    const [path, options] = apiRequestMock.mock.calls[0] as [string, { body: FormDataStub; method: string; auth: boolean }];

    expect(path).toBe('/api/users/me/avatar');
    expect(options.method).toBe('POST');
    expect(options.auth).toBe(true);
    expect(options.body).toBeInstanceOf(FormDataStub);
    expect(options.body.fields).toHaveLength(1);
    expect(options.body.fields[0]).toEqual(['file', {
      uri: 'file:///avatar.png', name: 'avatar.png', type: 'image/png',
    }]);

    await profileApi.deleteAvatar();
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/users/me/avatar', { method: 'DELETE', auth: true });
  });

  it('changes the password with only the current and new password fields', async () => {
    const body = { currentPassword: 'old-secret', newPassword: 'new-secret' };
    await profileApi.changePassword(body);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/users/me/password', { method: 'POST', body, auth: true });
  });
});
