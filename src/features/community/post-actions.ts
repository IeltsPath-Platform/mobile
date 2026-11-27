import type { QueryClient } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';

import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';

import { communityApi, type CommunityPost, type ReactionType } from './api';
import {
  applyPostReaction,
  removeAuthorFromCaches,
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

/**
 * The server says the post is gone (someone deleted it): drop it from the lists and the open screen, so the viewer is not
 * left looking at a post that every tap now fails on. Other errors leave the cached post alone.
 */
function dropIfGone(qc: QueryClient, postId: string, error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 404) return;
  removePostFromCaches(qc, postId);
  qc.removeQueries({ queryKey: ['community', 'detail', postId] });
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
      // Restore only the reaction fields so concurrent bookmark/follow/comment updates survive.
      updateCommunityPostCache(qc, post.id, (cached) => ({ ...cached, myReaction: post.myReaction, reactionCounts: post.reactionCounts }));
      dropIfGone(qc, post.id, error);
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
      dropIfGone(qc, post.id, error);
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
      // After the screen has left: the cached detail would otherwise show the deleted post when a notification opens it.
      qc.removeQueries({ queryKey: ['community', 'detail', post.id] });
    } catch (error) {
      restore();
      fail('Không thể xóa bài viết', error);
    }
  });
}

export const REPORT_REASONS = ['Spam', 'Nội dung không phù hợp', 'Thông tin sai lệch'] as const;

/** Asks before a destructive step; React Native's Alert has no buttons on the web, so the browser's confirm stands in. */
export function confirmDestructive(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/**
 * Blocks a learner after the viewer confirms. Both stop seeing each other's posts, comments and profile, so their posts
 * leave the cached lists at once and the lists are read again. Resolves true once blocked.
 */
export async function blockUser(qc: QueryClient, userId: string, displayName: string) {
  const confirmed = await confirmDestructive(
    `Chặn ${displayName}?`,
    'Hai bạn sẽ không thấy bài viết, bình luận và hồ sơ của nhau, không thể nhắc tên hay theo dõi nhau. Bạn có thể bỏ chặn trong mục Người đã chặn.',
    'Chặn',
  );
  if (!confirmed) return false;
  let blocked = false;
  await guarded(`block:${userId}`, async () => {
    try {
      await communityApi.block(userId);
      removeAuthorFromCaches(qc, userId);
      void qc.invalidateQueries({ queryKey: ['community'] });
      haptics.success();
      blocked = true;
    } catch (error) {
      fail('Không thể chặn người dùng này', error);
    }
  });
  return blocked;
}