import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/src/lib/api-client', () => ({ apiRequest: request }));
vi.mock('@/src/lib/image-upload-form', () => ({ imageUploadForm: vi.fn() }));
import { communityApi, type Comment, type OffsetPage } from '../src/features/community/api';
import { applyCommentReaction, reactToComment } from '../src/features/community/comment-reactions';

const comment = (parentCommentId: string | null = null): Comment => ({
  id: 'comment-1', authorId: 'user-1', parentCommentId, body: 'Helpful explanation', replyCount: 0,
  reactionCounts: { LIKE: 3, LOVE: 1, HELPFUL: 0, ACCURATE: 0 }, myReaction: 'LIKE',
});
const data = (row: Comment): InfiniteData<OffsetPage<Comment>> => ({
  pageParams: [0], pages: [{ content: [row], page: 0, size: 20, totalElements: 1, totalPages: 1, last: true }],
});

beforeEach(() => { request.mockReset(); });

describe('comment reactions', () => {
  it('adds, replaces and removes only the current viewer reaction', () => {
    expect(applyCommentReaction(comment(), 'LIKE')).toMatchObject({ myReaction: null, reactionCounts: { LIKE: 2, LOVE: 1 } });
    expect(applyCommentReaction(comment(), 'LOVE')).toMatchObject({ myReaction: 'LOVE', reactionCounts: { LIKE: 2, LOVE: 2 } });
    expect(applyCommentReaction({ ...comment(), myReaction: null }, 'HELPFUL')).toMatchObject({ myReaction: 'HELPFUL', reactionCounts: { LIKE: 3, HELPFUL: 1 } });
  });

  it('uses authenticated PUT/DELETE endpoints with no response body required', async () => {
    request.mockResolvedValue(null);
    await communityApi.reactToComment('comment/1', 'LOVE');
    await communityApi.removeCommentReaction('comment/1', 'LOVE');
    expect(request.mock.calls).toEqual([
      ['/api/community/comments/comment%2F1/reactions/LOVE', { method: 'PUT', auth: true }],
      ['/api/community/comments/comment%2F1/reactions/LOVE', { method: 'DELETE', auth: true }],
    ]);
  });

  it('updates replies and refetches only their parent thread, without deleting before switching', async () => {
    const client = new QueryClient();
    const row = comment('parent-1');
    const key = ['community', 'replies', 'parent-1'];
    client.setQueryData(key, data(row));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    request.mockResolvedValue(null);
    await reactToComment(client, 'post-1', row, 'LOVE');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].method).toBe('PUT');
    expect(client.getQueryData<InfiniteData<OffsetPage<Comment>>>(key)?.pages[0].content[0].myReaction).toBe('LOVE');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true });
    client.clear();
  });

  it('restores reaction fields on failure while retaining a concurrent edit', async () => {
    const client = new QueryClient();
    const row = comment();
    const key = ['community', 'comments', 'post-1'];
    client.setQueryData(key, data(row));
    request.mockImplementation(async () => {
      client.setQueryData(key, data({ ...applyCommentReaction(row, 'HELPFUL'), body: 'Edited body', replyCount: 2 }));
      throw new Error('Network unavailable');
    });
    await expect(reactToComment(client, 'post-1', row, 'HELPFUL')).rejects.toThrow('Network unavailable');
    expect(client.getQueryData<InfiniteData<OffsetPage<Comment>>>(key)?.pages[0].content[0]).toMatchObject({
      body: 'Edited body', replyCount: 2, myReaction: 'LIKE', reactionCounts: row.reactionCounts,
    });
    client.clear();
  });

  it('ignores rapid duplicate taps and reads current cached selection before toggling', async () => {
    const client = new QueryClient();
    const row = comment();
    client.setQueryData(['community', 'comments', 'post-1'], data({ ...row, myReaction: 'LOVE' }));
    let resolve!: () => void;
    request.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const first = reactToComment(client, 'post-1', row, 'LOVE');
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await reactToComment(client, 'post-1', row, 'HELPFUL');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].method).toBe('DELETE');
    resolve();
    await first;
    client.clear();
  });
});
