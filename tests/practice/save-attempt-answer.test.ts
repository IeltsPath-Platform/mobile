import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => {
  // The real module loads React Native; only the error shape the save reads matters here.
  class ApiError extends Error {
    constructor(readonly status: number, message: string, _details?: null, extras?: { code?: string }) { super(message); this.code = extras?.code; }
    readonly code?: string;
  }
  return { apiRequest: vi.fn(), ApiError };
});
vi.mock('@/src/lib/api-client', () => http);

import { saveAttemptAnswer } from '@/src/features/practice/api/attempts';

const sentRevisions = () => http.apiRequest.mock.calls
  .filter(([, options]) => options?.method === 'PUT')
  .map(([, options]) => (options.body as { expectedRevision: number }).expectedRevision);

const { ApiError } = http;

beforeEach(() => http.apiRequest.mockReset());

describe('saveAttemptAnswer', () => {
  it('reads the server revision and saves again when an earlier reply was lost', async () => {
    http.apiRequest
      .mockRejectedValueOnce(new ApiError(409, 'The assessment was changed by another request'))
      .mockResolvedValueOnce([{ attemptItemId: 'other', revision: 9 }, { attemptItemId: 'item', revision: 3 }])
      .mockResolvedValueOnce({ attemptItemId: 'item', revision: 4 });
    await expect(saveAttemptAnswer('a', 'item', 'B', 2)).resolves.toMatchObject({ revision: 4 });
    expect(sentRevisions()).toEqual([2, 3]);
  });

  it('does not retry a refusal that has its own reason, such as an expired test', async () => {
    const expired = new ApiError(409, 'expired', null, { code: 'ATTEMPT_EXPIRED' });
    http.apiRequest.mockRejectedValueOnce(expired);
    await expect(saveAttemptAnswer('a', 'item', 'B', 2)).rejects.toBe(expired);
    expect(http.apiRequest).toHaveBeenCalledTimes(1);
  });
});
