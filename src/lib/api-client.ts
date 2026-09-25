import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './env';
import { tokenStorage, type SessionTokens } from './token-storage';

type ErrorBody = {
  status?: number;
  message?: string;
  path?: string;
  details?: Record<string, string> | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string> | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? {};
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

type TokenPair = { accessToken: string; refreshToken: string };

const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API.';
const FALLBACK_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.';

let sessionExpiredListener: (() => void) | null = null;
let refreshInFlight: Promise<SessionTokens | null> | null = null;

export function onSessionExpired(listener: (() => void) | null) {
  sessionExpiredListener = listener;
}

async function send(path: string, options: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  options.signal?.addEventListener('abort', () => controller.abort());

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // The backend prefers the refresh_token cookie over the body; mobile relies on the body only.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = (data ?? {}) as ErrorBody;
    throw new ApiError(response.status, body.message || FALLBACK_ERROR_MESSAGE, body.details);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function refreshTokens(): Promise<SessionTokens | null> {
  const current = await tokenStorage.load();
  if (!current) return null;

  try {
    const response = await send('/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } });
    const pair = await parse<TokenPair>(response);
    const next = { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    await tokenStorage.save(next);
    return next;
  } catch (error) {
    if (error instanceof ApiError && error.isNetworkError) throw error;
    await tokenStorage.clear();
    return null;
  }
}

// Refresh tokens rotate, so concurrent 401s must share a single refresh call.
function refreshOnce() {
  refreshInFlight ??= refreshTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!options.auth) return parse<T>(await send(path, options));

  const tokens = await tokenStorage.load();
  if (!tokens) {
    sessionExpiredListener?.();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.');
  }

  const response = await send(path, options, tokens.accessToken);
  if (response.status !== 401) return parse<T>(response);

  const latest = await tokenStorage.load();
  const refreshed = latest && latest.accessToken !== tokens.accessToken ? latest : await refreshOnce();
  if (!refreshed) {
    sessionExpiredListener?.();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }
  return parse<T>(await send(path, options, refreshed.accessToken));
}
