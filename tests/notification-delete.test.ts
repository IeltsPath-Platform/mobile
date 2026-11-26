import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequest = vi.fn();
vi.mock('@/src/lib/api-client', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args), ApiError: class ApiError extends Error { status = 503; } }));
vi.mock('@/src/lib/image-upload-form', () => ({ imageUploadForm: vi.fn() }));

import { communityApi } from '../src/features/community/api';
import { isReadNotification, removeNotifications } from '../src/features/community/notification-cache';

const row = (id: string, readAt: string | null = null) => ({ id, readAt });

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue(undefined);
});

describe('notification deletion', () => {
  it('deletes one notification and all read notifications on the backend routes', async () => {
    await communityApi.deleteNotification('n 1');
    expect(apiRequest).toHaveBeenLastCalledWith('/api/notifications/n%201', { method: 'DELETE', auth: true });
    await communityApi.deleteReadNotifications();
    expect(apiRequest).toHaveBeenLastCalledWith('/api/notifications/read', { method: 'DELETE', auth: true });
  });

  it('removes matching rows from every page and keeps the page structure', () => {
    const data = { pages: [[row('a'), row('b', 'x')], [row('c', 'y'), row('d')]], pageParams: [0, 1] };
    const result = removeNotifications(data, isReadNotification)!;
    expect(result.pages.map((page) => page.map((item) => item.id))).toEqual([['a'], ['d']]);
    expect(result.pageParams).toEqual([0, 1]);
    expect(removeNotifications(data, (item) => item.id === 'a')!.pages[0].map((item) => item.id)).toEqual(['b']);
    expect(removeNotifications(undefined, isReadNotification)).toBeUndefined();
  });
});
