import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/env', () => ({ API_BASE_URL: 'https://api.test', API_CONFIGURATION_ERROR: null, REQUEST_TIMEOUT_MS: 100 }));
const state = vi.hoisted(() => ({ tokens: null as { accessToken: string; refreshToken: string } | null }));
vi.mock('../src/lib/token-storage', () => ({
  tokenStorage: { load: async () => state.tokens, save: async (v: typeof state.tokens) => { state.tokens = v; }, clear: async () => { state.tokens = null; } },
}));

import { apiRequest, onSessionExpired } from '../src/lib/api-client';
import { newPasswordError, weakPasswordMessage } from '../src/lib/password-rules';
import { isPremiumRequired } from '../src/features/practice/api/premium-error';
import { gradeOptions } from '../src/features/practice/model/grade-options';
import { isActivePremium } from '../src/features/practice/model/premium';
import { describeDevice, formatSessionTime } from '../src/features/profile/session-view';

const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
const revoked = { status: 401, code: 'SESSION_REVOKED', message: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.' };

beforeEach(() => {
  state.tokens = { accessToken: 'old', refreshToken: 'refresh-old' };
  vi.unstubAllGlobals();
  vi.stubGlobal('__DEV__', false);
});

describe('a session ended elsewhere', () => {
  it('signs out when the refresh token was revoked too', async () => {
    const expired = vi.fn();
    onSessionExpired(expired);
    vi.stubGlobal('fetch', async (url: string) => (url.endsWith('/auth/refresh') ? json(401, {}) : json(401, revoked)));
    await expect(apiRequest('/me', { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(state.tokens).toBeNull();
    expect(expired).toHaveBeenCalled();
    onSessionExpired(null);
  });

  it('keeps the session when only the old access token was revoked', async () => {
    vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'new', refreshToken: 'refresh-new' });
      return (options.headers as Record<string, string>).Authorization === 'Bearer new' ? json(200, { ok: true }) : json(401, revoked);
    });
    await expect(apiRequest('/me', { auth: true })).resolves.toEqual({ ok: true });
    expect(state.tokens?.accessToken).toBe('new');
  });

  it('sends the reauthentication header with the request', async () => {
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => json(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/api/users/me/password/initial', { method: 'POST', auth: true, body: {}, headers: { 'X-Reauth-Token': 'proof' } });
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'X-Reauth-Token': 'proof', Authorization: 'Bearer old' });
  });
});

describe('new passwords', () => {
  it('needs 8 characters and fits 72 bytes', () => {
    expect(newPasswordError('1234567')).toMatch('ít nhất 8');
    expect(newPasswordError('abcd1234')).toBeNull();
    expect(newPasswordError('a'.repeat(72))).toBeNull();
    expect(newPasswordError('ệ'.repeat(25))).toMatch('quá dài');
  });

  it('turns the reasons of a weak password into sentences', async () => {
    expect(weakPasswordMessage('TOO_COMMON,TOO_SIMPLE')).toMatch(/quá phổ biến.*quá đơn giản/);
    expect(weakPasswordMessage('SOMETHING_NEW')).toBeNull();
    vi.stubGlobal('fetch', async () => json(400, { code: 'WEAK_PASSWORD', message: 'Mật khẩu chưa đủ mạnh.', details: { reasons: 'CONTAINS_ACCOUNT_INFO' } }));
    await expect(apiRequest('/auth/reset-password', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'WEAK_PASSWORD', message: expect.stringContaining('không được chứa email') });
  });
});

describe('Premium', () => {
  const plan = { id: 's', userId: 'u', planId: 'p', planCode: 'PREMIUM', planName: 'Premium', status: 'ACTIVE' as const, startsAt: '', endsAt: null, humanGradingCreditsTotal: 0, humanGradingCreditsUsed: 0, remainingCredits: 0, createdAt: '', updatedAt: '' };

  it('counts only a plan that is active and not past its end', () => {
    expect(isActivePremium(plan)).toBe(true);
    expect(isActivePremium({ ...plan, endsAt: '2020-01-01T00:00:00Z' })).toBe(false);
    expect(isActivePremium({ ...plan, status: 'CANCELLED' })).toBe(false);
    expect(isActivePremium(null)).toBe(false);
    expect(isActivePremium(undefined)).toBe(false);
  });

  it('grades by AI for free, even with no points', () => {
    expect(gradeOptions({ balance: 0, cost: 10, subscription: plan }).ai).toMatchObject({ enabled: true, cost: 0, shortBy: 0 });
    expect(gradeOptions({ balance: 0, cost: 10, subscription: null }).ai).toMatchObject({ enabled: false, cost: 10, shortBy: 10 });
  });

  it('reads the refusal of a Premium test from either error shape', async () => {
    for (const body of [{ details: { code: 'PREMIUM_REQUIRED' } }, { code: 'PREMIUM_REQUIRED' }]) {
      vi.stubGlobal('fetch', async () => json(403, { ...body, message: 'Đề này dành cho tài khoản Premium.' }));
      const cause = await apiRequest('/task', { auth: true }).catch((error: unknown) => error);
      expect(isPremiumRequired(cause)).toBe(true);
    }
    vi.stubGlobal('fetch', async () => json(503, { details: { code: 'ENTITLEMENT_UNAVAILABLE' } }));
    expect(isPremiumRequired(await apiRequest('/task', { auth: true }).catch((error: unknown) => error))).toBe(false);
  });
});

describe('signed-in devices', () => {
  it('names the device from the User-Agent', () => {
    expect(describeDevice('okhttp/4.12.0')).toBe('Ứng dụng trên Android');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36')).toBe('Trình duyệt Chrome trên Windows');
    expect(describeDevice(null)).toBe('Thiết bị không xác định');
  });

  it('reads a time without a zone as UTC', () => {
    expect(formatSessionTime('2026-11-25T10:00:00')).toBe(formatSessionTime('2026-11-25T10:00:00Z'));
    expect(formatSessionTime(null)).toBe('—');
  });
});
