import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/env', () => ({ API_BASE_URL: 'https://api.test', API_CONFIGURATION_ERROR: null, REQUEST_TIMEOUT_MS: 100 }));
const state = vi.hoisted(() => ({ tokens: { accessToken: 'old', refreshToken: 'refresh-old' } as { accessToken: string; refreshToken: string } | null }));
vi.mock('../src/lib/token-storage', () => ({
  tokenStorage: { load: async () => state.tokens, save: async (v: typeof state.tokens) => { state.tokens = v; }, clear: async () => { state.tokens = null; } },
}));
import { apiRequest } from '../src/lib/api-client';

beforeEach(() => { state.tokens = { accessToken: 'old', refreshToken: 'refresh-old' }; vi.unstubAllGlobals(); });
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
describe('refresh token contract', () => {
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
