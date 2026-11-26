import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/api-client', () => {
  class MockApiError extends Error {
    constructor(readonly status: number, message: string) {
      super(message);
    }
  }

  return { ApiError: MockApiError, apiRequest: vi.fn() };
});

import { ApiError } from '@/src/lib/api-client';
import { activationErrorMessage } from '@/src/features/practice/api/access';

describe('activationErrorMessage', () => {
  it('does not expose unknown exception text', () => {
    const fallback = activationErrorMessage(null);

    expect(activationErrorMessage(new Error('Network request failed'))).toBe(fallback);
    expect(activationErrorMessage(new TypeError('Unexpected token at position 1'))).toBe(fallback);
  });

  it('does not expose English service errors', () => {
    const message = activationErrorMessage(new ApiError(500, 'Internal Server Error'));

    expect(message).not.toContain('Internal Server Error');
  });
});
