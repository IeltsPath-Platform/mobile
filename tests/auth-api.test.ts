import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/env', () => ({ API_BASE_URL: 'https://api.test', API_CONFIGURATION_ERROR: null, REQUEST_TIMEOUT_MS: 100 }));
vi.mock('../src/lib/token-storage', () => ({ tokenStorage: { load: async () => null, save: async () => {}, clear: async () => {} } }));
import { authApi } from '../src/features/auth/api';

const json = (status: number, data: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers });
const call = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, method: options.method, body: JSON.parse(String(options.body)) };
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('__DEV__', false);
});

describe('auth endpoints', () => {
  it.each([
    ['google', () => authApi.google('id-token'), '/auth/google', { idToken: 'id-token' }],
    ['verifyEmail', () => authApi.verifyEmail('abc'), '/auth/verify-email', { token: 'abc' }],
    ['resendVerification', () => authApi.resendVerification('a@b.c'), '/auth/resend-verification', { email: 'a@b.c' }],
    ['login', () => authApi.login({ email: 'a@b.c', password: 'secret1' }), '/auth/login', { email: 'a@b.c', password: 'secret1' }],
  ])('%s posts to the gateway path', async (_name, run, path, body) => {
    const fetchMock = vi.fn(async () => json(200, { message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await run();
    expect(call(fetchMock)).toEqual({ url: `https://api.test${path}`, method: 'POST', body });
  });

  it('exposes Retry-After and the error code of a rate-limited login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(429, { message: 'Thử lại sau', code: 'LOGIN_RATE_LIMITED' }, { 'Retry-After': '30' })));
    await expect(authApi.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      status: 429,
      code: 'LOGIN_RATE_LIMITED',
      retryAfterSeconds: 30,
    });
  });
});
