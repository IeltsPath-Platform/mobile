import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-image-manipulator', () => ({ manipulateAsync: vi.fn(), SaveFormat: { JPEG: 'jpeg' } }));
vi.mock('expo-file-system', () => ({ File: class {} }));

import { profileApi } from '@/src/features/profile/api';

describe('account deletion', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(undefined);
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

describe('days with us', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  it('counts the sign-up day as day 1', async () => {
    const { daysWithUs } = await import('@/src/features/profile/account-deletion');
    expect(daysWithUs('2026-11-27T08:00:00Z', now)).toBe(1);
    expect(daysWithUs('2026-11-20T12:00:00Z', now)).toBe(8);
    expect(daysWithUs(undefined, now)).toBeNull();
    expect(daysWithUs('not a date', now)).toBeNull();
  });
});

describe('deletion summary', () => {
  it('names the points and Premium only when the learner has them', async () => {
    const { deletionSummary } = await import('@/src/features/profile/account-deletion');
    expect(deletionSummary({})).toBe('Xóa tài khoản sẽ xóa luôn tiến độ học, bài nộp, bản ghi âm và flashcard. Không thể khôi phục.');
    expect(deletionSummary({ balance: 0 })).not.toContain('điểm');
    expect(deletionSummary({ balance: 1250, premium: true })).toBe(
      'Xóa tài khoản sẽ xóa luôn tiến độ học, bài nộp, bản ghi âm, flashcard, 1.250 điểm và gói Premium đang dùng. Không thể khôi phục.',
    );
  });
});
