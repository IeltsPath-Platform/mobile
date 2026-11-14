import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequest = vi.fn();
vi.mock('@/src/lib/api-client', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args), ApiError: class ApiError extends Error { status = 503; } }));
vi.mock('@/src/lib/image-upload-form', () => ({ imageUploadForm: vi.fn() }));

import { communityApi } from '../src/features/community/api';
import { gamificationApi } from '../src/features/progress/gamification-api';

const lastCall = () => apiRequest.mock.calls.at(-1) as [string, { method?: string; body?: unknown; auth?: boolean }];

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({ content: [], nextCursor: null, hasNext: false, size: 0 });
});

describe('community API requests match the gateway routes', () => {
  it('uses POST to follow/bookmark and DELETE to undo', async () => {
    await communityApi.bookmark('p1', false);
    expect(lastCall()).toMatchObject(['/api/community/posts/p1/bookmark', { method: 'POST', auth: true }]);
    await communityApi.bookmark('p1', true);
    expect(lastCall()).toMatchObject(['/api/community/posts/p1/bookmark', { method: 'DELETE' }]);
    await communityApi.follow('u1', false);
    expect(lastCall()).toMatchObject(['/api/community/users/u1/follow', { method: 'POST' }]);
    await communityApi.follow('u1', true);
    expect(lastCall()).toMatchObject(['/api/community/users/u1/follow', { method: 'DELETE' }]);
  });

  it('reacts with PUT and removes the reaction with DELETE on the typed path', async () => {
    await communityApi.react('p1', 'LOVE');
    expect(lastCall()).toMatchObject(['/api/community/posts/p1/reactions/LOVE', { method: 'PUT' }]);
    await communityApi.removeReaction('p1', 'LOVE');
    expect(lastCall()).toMatchObject(['/api/community/posts/p1/reactions/LOVE', { method: 'DELETE' }]);
    await communityApi.reactToComment('c1', 'LIKE');
    expect(lastCall()).toMatchObject(['/api/community/comments/c1/reactions/LIKE', { method: 'PUT' }]);
  });

  it('requests the feed with cursor pagination and only sends the filters that are set', async () => {
    await communityApi.feed('cur', 'FOLLOWING', undefined, 'band 7');
    const [path] = lastCall();
    expect(path).toContain('/api/community/posts?');
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('pagination')).toBe('cursor');
    expect(params.get('scope')).toBe('FOLLOWING');
    expect(params.get('cursor')).toBe('cur');
    expect(params.get('q')).toBe('band 7');
    expect(params.has('category')).toBe(false);
  });

  it('sends comments, edits, reports and notification calls to the documented routes', async () => {
    await communityApi.comment('p1', 'hi', 'parent');
    expect(lastCall()).toMatchObject(['/api/community/posts/p1/comments', { method: 'POST', body: { body: 'hi', parentCommentId: 'parent' } }]);
    await communityApi.updateComment('c1', 'edit');
    expect(lastCall()).toMatchObject(['/api/community/comments/c1', { method: 'PUT', body: { body: 'edit' } }]);
    await communityApi.report('POST', 'p1', 'Spam');
    expect(lastCall()).toMatchObject(['/api/community/reports', { method: 'POST', body: { contentType: 'POST', contentId: 'p1', reason: 'Spam' } }]);
    await communityApi.markRead('n1');
    expect(lastCall()).toMatchObject(['/api/notifications/n1/read', { method: 'PUT' }]);
    await communityApi.markAll();
    expect(lastCall()).toMatchObject(['/api/notifications/read-all', { method: 'PUT' }]);
    await communityApi.updatePreference('POST_COMMENT', false);
    expect(lastCall()).toMatchObject(['/api/notifications/preferences/POST_COMMENT', { method: 'PUT', body: { enabled: false } }]);
    await communityApi.unread();
    expect(lastCall()).toMatchObject(['/api/notifications/unread-count', { auth: true }]);
  });

  it('registers and removes a push device by installation id', async () => {
    await communityApi.registerNotificationDevice('inst-1', { platform: 'ANDROID', token: 'fcm' } as never);
    expect(lastCall()).toMatchObject(['/api/notifications/devices/inst-1', { method: 'PUT', auth: true }]);
    await communityApi.unregisterNotificationDevice('inst-1');
    expect(lastCall()).toMatchObject(['/api/notifications/devices/inst-1', { method: 'DELETE', auth: true }]);
  });

  it('keeps the learning timezone on the learning-service settings route', async () => {
    apiRequest.mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh' });
    await gamificationApi.updateSettings('Asia/Ho_Chi_Minh');
    expect(lastCall()).toMatchObject(['/api/learning/me/settings', { method: 'PUT', body: { timezone: 'Asia/Ho_Chi_Minh' }, auth: true }]);
  });
});
