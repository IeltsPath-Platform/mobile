import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/env', () => ({ API_BASE_URL: 'https://api.test', API_CONFIGURATION_ERROR: null, REQUEST_TIMEOUT_MS: 100 }));
vi.mock('../src/lib/token-storage', () => ({ tokenStorage: { load: async () => null, save: async () => {}, clear: async () => {} } }));

import { gameErrorMessage, isGone } from '../src/features/games/errors';
import { ApiError } from '../src/lib/api-client';

describe('game errors', () => {
  it('tells the learner to change the filter when there are not enough words', () => {
    const error = new ApiError(409, 'Thao tác này xung đột với trạng thái hiện tại.', null, { code: 'NOT_ENOUGH_WORDS' });
    expect(gameErrorMessage(error)).toContain('giảm số câu');
  });

  it('keeps the Vietnamese reason of the server for other conflicts', () => {
    const error = new ApiError(409, 'Bạn đang ở trong một phòng chơi khác', null, { code: 'ACTIVE_GAME_EXISTS' });
    expect(gameErrorMessage(error)).toBe('Bạn đang ở trong một phòng chơi khác');
  });

  it('never shows a native English error', () => {
    expect(gameErrorMessage(new TypeError('Cannot read property of null'))).toBe('Chưa mở được ván chơi. Thử lại sau nhé.');
  });

  it('treats only 403 and 404 as a room or match that is gone', () => {
    expect(isGone(new ApiError(404, 'x'))).toBe(true);
    expect(isGone(new ApiError(403, 'x'))).toBe(true);
    expect(isGone(new ApiError(0, 'x'))).toBe(false);
    expect(isGone(new ApiError(429, 'x'))).toBe(false);
    expect(isGone(null)).toBe(false);
  });
});
