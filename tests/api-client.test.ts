import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/env', () => ({ API_BASE_URL: 'https://api.test', API_CONFIGURATION_ERROR: null, REQUEST_TIMEOUT_MS: 100 }));
const state = vi.hoisted(() => ({ tokens: { accessToken: 'old', refreshToken: 'refresh-old' } as { accessToken: string; refreshToken: string } | null }));
vi.mock('../src/lib/token-storage', () => ({
  tokenStorage: { load: async () => state.tokens, save: async (v: typeof state.tokens) => { state.tokens = v; }, clear: async () => { state.tokens = null; } },
}));
import { apiRequest } from '../src/lib/api-client';

beforeEach(() => {
  state.tokens = { accessToken: 'old', refreshToken: 'refresh-old' };
  vi.unstubAllGlobals();
  vi.stubGlobal('__DEV__', false);
});
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
describe('refresh token contract', () => {
  it('does not report caller cancellation as a network failure', async () => {
    vi.stubGlobal('__DEV__', true);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('The operation was aborted.'); }));
    try {
      await expect(apiRequest('/cancelled', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
      expect(warning).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });

  it('still identifies a real timeout separately from cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('The operation was aborted.')));
    })));
    await expect(apiRequest('/slow', { timeoutMs: 5 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('allows multipart uploads longer than the regular API timeout', async () => {
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      await new Promise((resolve) => setTimeout(resolve, 140));
      return json(201, { url: 'https://storage.test/image.jpg' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/upload', { method: 'POST', body: new FormData(), auth: true }))
      .resolves.toEqual({ url: 'https://storage.test/image.jpg' });
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(false);
  });

  it('shares a rotating refresh across concurrent 401s and sends token in body', async () => {
    let refreshCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount++;
        expect(JSON.parse(options.body as string)).toEqual({ refreshToken: 'refresh-old' });
        expect(options.credentials).toBe('omit');
        await new Promise((resolve) => setTimeout(resolve, 5));
        return json(200, { accessToken: 'new', refreshToken: 'refresh-new' });
      }
      return (options.headers as Record<string, string>).Authorization === 'Bearer new' ? json(200, { ok: true }) : json(401, {});
    }));
    await Promise.all([apiRequest('/me', { auth: true }), apiRequest('/feed', { auth: true })]);
    expect(refreshCount).toBe(1);
  });
  it.each([503, 429, 502])('preserves session on transient refresh HTTP %s', async (status) => {
    vi.stubGlobal('fetch', async (url: string) => json(url.endsWith('/auth/refresh') ? status : 401, {}));
    await expect(apiRequest('/me', { auth: true })).rejects.toMatchObject({ status });
    expect(state.tokens?.refreshToken).toBe('refresh-old');
  });
  it('preserves session when refresh network fails', async () => {
    vi.stubGlobal('fetch', async (url: string) => { if (url.endsWith('/auth/refresh')) throw new Error(); return json(401, {}); });
    await expect(apiRequest('/me', { auth: true })).rejects.toMatchObject({ status: 0 });
    expect(state.tokens).not.toBeNull();
  });
  it('clears an invalid refresh session', async () => {
    vi.stubGlobal('fetch', async () => json(401, {}));
    await expect(apiRequest('/me', { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(state.tokens).toBeNull();
  });
});

describe('error messages', () => {
  it('replaces the English gateway 429 body with a Vietnamese message and keeps Retry-After', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ status: 429, message: 'Request rate limit exceeded' }), { status: 429, headers: { 'Retry-After': '3' } }));
    await expect(apiRequest('/feed')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 3, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau 3 giây.' });
  });
  it('still surfaces the server message for other errors', async () => {
    vi.stubGlobal('fetch', async () => json(409, { message: 'Hết tim', code: 'VOCAB_NO_HEARTS' }));
    await expect(apiRequest('/x', { method: 'POST' })).rejects.toMatchObject({ status: 409, code: 'VOCAB_NO_HEARTS', message: 'Hết tim' });
  });
});

describe('401 that rejects user input, not the session', () => {
  it('surfaces CURRENT_PASSWORD_INVALID without refreshing or signing out', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'new', refreshToken: 'refresh-new' });
      return json(401, { status: 401, message: 'Mật khẩu hiện tại không chính xác', details: { code: 'CURRENT_PASSWORD_INVALID' } });
    });
    await expect(apiRequest('/api/users/me/password', { method: 'POST', auth: true, body: {} }))
      .rejects.toMatchObject({ status: 401, code: 'CURRENT_PASSWORD_INVALID', message: 'Mật khẩu hiện tại không chính xác' });
    expect(calls.some((url) => url.endsWith('/auth/refresh'))).toBe(false);
    expect(state.tokens).toEqual({ accessToken: 'old', refreshToken: 'refresh-old' });
  });

  it('still refreshes when the 401 is a bare token rejection from the gateway', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push(url);
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'new', refreshToken: 'refresh-new' });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer new' ? json(200, { ok: true }) : json(401, { status: 401, error: 'Unauthorized', message: 'Unauthorized', details: null });
    });
    await expect(apiRequest('/api/users/me', { auth: true })).resolves.toEqual({ ok: true });
    expect(calls.filter((url) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(state.tokens?.refreshToken).toBe('refresh-new');
  });
});
