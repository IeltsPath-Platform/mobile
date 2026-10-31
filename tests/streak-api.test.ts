import { describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));

import { streakApi } from '@/src/features/progress/streak-api';

describe('streakApi', () => {
  it('uses the current learning-service streak endpoint with auth', async () => {
    await streakApi.get();
    expect(apiRequestMock).toHaveBeenCalledWith('/api/learning/me/streak', { auth: true });
  });
});
