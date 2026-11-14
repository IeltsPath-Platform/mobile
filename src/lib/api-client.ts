import { API_BASE_URL, API_CONFIGURATION_ERROR, REQUEST_TIMEOUT_MS } from './env';
import { tokenStorage, type SessionTokens } from './token-storage';

type ErrorBody = {
  status?: number;
  message?: string;
  detail?: string;
  code?: string;
  path?: string;
  details?: Record<string, string> | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, string>;
  readonly code?: string;
  /** Seconds from the Retry-After header of a 429, when the server sent one. */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    details?: Record<string, string> | null,
    extras?: { code?: string; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? {};
    this.code = extras?.code ?? details?.code;
    this.retryAfterSeconds = extras?.retryAfterSeconds;
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
  timeoutMs?: number;
};

type TokenPair = { accessToken: string; refreshToken: string };

const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API.';
const FALLBACK_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.';
const MULTIPART_TIMEOUT_MS = 60_000;

let sessionExpiredListener: (() => void) | null = null;
let refreshInFlight: Promise<SessionTokens | null> | null = null;

export function onSessionExpired(listener: (() => void) | null) {
  sessionExpiredListener = listener;
}

async function send(path: string, options: RequestOptions, accessToken?: string): Promise<Response> {
  if (API_CONFIGURATION_ERROR) throw new ApiError(0, API_CONFIGURATION_ERROR, null, { code: 'API_CONFIGURATION' });
  const headers: Record<string, string> = { Accept: 'application/json' };
  const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options.timeoutMs ?? (multipart ? MULTIPART_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body),
      // The backend prefers the refresh_token cookie over the body; mobile relies on the body only.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (cause) {
    if (options.signal?.aborted && !timedOut) {
      const cancelled = new Error('Request cancelled');
      cancelled.name = 'AbortError';
      throw cancelled;
    }
    const reason = cause instanceof Error ? cause.message : String(cause);
    if (__DEV__) {
      console.warn('[api] Network request failed', {
        method: options.method ?? 'GET',
        url: `${API_BASE_URL}${path}`,
        reason,
      });
    }
    throw new ApiError(0, timedOut ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' : NETWORK_ERROR_MESSAGE,
      null, { code: timedOut ? 'TIMEOUT' : options.signal?.aborted ? 'CANCELLED' : 'NETWORK' });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = (data ?? {}) as ErrorBody;
    const fallback = response.status === 503 ? 'Dịch vụ tạm chưa sẵn sàng. Kiểm tra backend rồi thử lại.' : FALLBACK_ERROR_MESSAGE;
    throw new ApiError(response.status, body.message || body.detail || fallback, body.details, {
      code: body.code,
      retryAfterSeconds: readRetryAfter(response.headers.get('Retry-After')),
    });
  }
  return data as T;
}

function readRetryAfter(value: string | null): number | undefined {
  const seconds = value ? Number(value) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
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
    if (!pair?.accessToken || !pair?.refreshToken) throw new ApiError(502, 'Phản hồi làm mới phiên không hợp lệ.');
    const next = { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    if ((await tokenStorage.load())?.refreshToken !== current.refreshToken) return tokenStorage.load();
    await tokenStorage.save(next);
    return next;
  } catch (error) {
    if (!(error instanceof ApiError) || ![400, 401, 403].includes(error.status)) throw error;
    if ((await tokenStorage.load())?.refreshToken !== current.refreshToken) return tokenStorage.load();
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
  const retry = await send(path, options, refreshed.accessToken);
  if (retry.status === 401) {
    // A freshly issued token was rejected too: the session cannot be recovered.
    await tokenStorage.clear();
    sessionExpiredListener?.();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }
  return parse<T>(retry);
}
