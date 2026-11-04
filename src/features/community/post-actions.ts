import type { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { haptics } from '@/src/lib/haptics';

import { communityApi, type CommunityPost, type ReactionType } from './api';
import {
  applyPostReaction,
  removePostFromCaches,
  setAuthorFollowing,
  snapshotPostCaches,
  updateCommunityPostCache,
} from './post-cache';

/** One request per (action, post) at a time, so rapid taps never race each other. */
const inFlight = new Set<string>();

async function guarded(key: string, run: () => Promise<void>) {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try { await run(); } finally { inFlight.delete(key); }
}

function fail(title: string, error: unknown) {
  haptics.error();
  Alert.alert(title, error instanceof Error ? error.message : 'Vui lòng thử lại.');
}

/** Add, switch or remove the viewer's reaction. UI updates first; the cache is restored on failure. */
export function reactToPost(qc: QueryClient, post: CommunityPost, type: ReactionType) {
  return guarded(`react:${post.id}`, async () => {
    updateCommunityPostCache(qc, post.id, () => applyPostReaction(post, type));
    try {
      await (post.myReaction === type ? communityApi.removeReaction(post.id, type) : communityApi.react(post.id, type));
    } catch (error) {
      updateCommunityPostCache(qc, post.id, () => post);
      fail('Không thể thả cảm xúc', error);
    }
  });
}

export function toggleBookmark(qc: QueryClient, post: CommunityPost) {
  return guarded(`bookmark:${post.id}`, async () => {
    const saving = !post.bookmarkedByMe;
    const restore = snapshotPostCaches(qc);
    updateCommunityPostCache(qc, post.id, (cached) => ({ ...cached, bookmarkedByMe: saving }));
    // Un-saving from the saved list drops the row right away.
    if (!saving) removePostFromCaches(qc, post.id, ['bookmarks']);
    try {
      await communityApi.bookmark(post.id, post.bookmarkedByMe);
    } catch (error) {
      restore();
      updateCommunityPostCache(qc, post.id, () => post);
      fail('Không thể cập nhật bài đã lưu', error);
    }
  });
}

export function toggleFollowAuthor(qc: QueryClient, post: CommunityPost) {
  return guarded(`follow:${post.authorId}`, async () => {
    const was = Boolean(post.followingAuthor);
    setAuthorFollowing(qc, post.authorId, !was);
    try {
      await communityApi.follow(post.authorId, was);
    } catch (error) {
      setAuthorFollowing(qc, post.authorId, was);
      fail('Không thể cập nhật theo dõi', error);
    }
  });
}

export async function reportContent(type: 'POST' | 'COMMENT', id: string, reason: string) {
  try {
    await communityApi.report(type, id, reason);
    haptics.success();
    Alert.alert('Đã gửi báo cáo', 'Cảm ơn bạn. Đội ngũ kiểm duyệt sẽ xem xét nội dung này.');
  } catch (error) {
    fail('Không gửi được báo cáo', error);
  }
}

export function deletePost(qc: QueryClient, post: CommunityPost, onDone?: () => void) {
  return guarded(`delete:${post.id}`, async () => {
    const restore = snapshotPostCaches(qc);
    removePostFromCaches(qc, post.id);
    try {
      await communityApi.delete(post.id);
      haptics.success();
      onDone?.();
    } catch (error) {
      restore();
      fail('Không thể xóa bài viết', error);
    }
  });
}

export const REPORT_REASONS = ['Spam', 'Nội dung không phù hợp', 'Thông tin sai lệch'] as const;
