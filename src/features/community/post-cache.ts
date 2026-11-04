import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CommunityPost, CursorPage, PublicProfile, ReactionType } from './api';

type CachedCommunityEntry = CommunityPost | PublicProfile;

function patchPages<T extends CachedCommunityEntry>(
  data: InfiniteData<CursorPage<T>> | undefined,
  postId: string,
  update: (post: CommunityPost) => CommunityPost,
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.map((entry) =>
        entry.id === postId && 'reactionCounts' in entry ? update(entry) as T : entry,
      ),
    })),
  };
}

/** Patch cached copies in place so a reaction never forces the whole feed to refetch. */
export function updateCommunityPostCache(
  queryClient: QueryClient,
  postId: string,
  update: (post: CommunityPost) => CommunityPost,
) {
  queryClient.setQueriesData<InfiniteData<CursorPage<CommunityPost>>>({ queryKey: ['community', 'feed'] }, (data) =>
    patchPages(data, postId, update),
  );
  queryClient.setQueriesData<InfiniteData<CursorPage<CommunityPost>>>({ queryKey: ['community', 'bookmarks'] }, (data) =>
    patchPages(data, postId, update),
  );
  queryClient.setQueriesData<InfiniteData<CursorPage<CachedCommunityEntry>>>({ queryKey: ['community', 'profile-list'] }, (data) =>
    patchPages(data, postId, update),
  );
  queryClient.setQueryData<CommunityPost>(['community', 'detail', postId], (post) => post ? update(post) : post);
}

export function applyPostReaction(post: CommunityPost, type: ReactionType): CommunityPost {
  const current = post.myReaction as ReactionType | null | undefined;
  const next = current === type ? null : type;
  const reactionCounts = { ...post.reactionCounts };

  if (current) {
    reactionCounts[current] = Math.max(0, (reactionCounts[current] ?? 0) - 1);
    if (reactionCounts[current] === 0) delete reactionCounts[current];
  }
  if (next) reactionCounts[next] = (reactionCounts[next] ?? 0) + 1;

  return { ...post, myReaction: next, reactionCounts };
}

type Relationship = { following: boolean; followerCount: number; followingCount: number };

/** Mirror a follow / unfollow on every cached post by that author plus their relationship counters. */
export function setAuthorFollowing(queryClient: QueryClient, authorId: string, following: boolean) {
  const patch = <T extends CachedCommunityEntry>(data: InfiniteData<CursorPage<T>> | undefined) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        content: page.content.map((entry) =>
          'reactionCounts' in entry && entry.authorId === authorId ? { ...entry, followingAuthor: following } as T : entry,
        ),
      })),
    };
  };
  for (const key of ['feed', 'bookmarks', 'profile-list'] as const) {
    queryClient.setQueriesData<InfiniteData<CursorPage<CachedCommunityEntry>>>({ queryKey: ['community', key] }, patch);
  }
  queryClient.setQueriesData<CommunityPost>({ queryKey: ['community', 'detail'] }, (post) =>
    post && post.authorId === authorId ? { ...post, followingAuthor: following } : post,
  );
  queryClient.setQueryData<Relationship>(['community', 'relationship', authorId], (relation) => {
    if (!relation || relation.following === following) return relation;
    return { ...relation, following, followerCount: Math.max(0, relation.followerCount + (following ? 1 : -1)) };
  });
}

type PostCacheKey = 'feed' | 'bookmarks' | 'profile-list';
const ALL_POST_CACHES: PostCacheKey[] = ['feed', 'bookmarks', 'profile-list'];

/** Capture every cached post list so an optimistic change can be undone exactly. */
export function snapshotPostCaches(queryClient: QueryClient) {
  const entries = ALL_POST_CACHES.flatMap((key) => queryClient.getQueriesData({ queryKey: ['community', key] }));
  return () => entries.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
}

/** Drop a post from cached lists (all of them unless `only` narrows it) without refetching. */
export function removePostFromCaches(queryClient: QueryClient, postId: string, only: PostCacheKey[] = ALL_POST_CACHES) {
  for (const key of only) {
    queryClient.setQueriesData<InfiniteData<CursorPage<CachedCommunityEntry>>>({ queryKey: ['community', key] }, (data) => data && ({
      ...data,
      pages: data.pages.map((page) => ({ ...page, content: page.content.filter((entry) => entry.id !== postId) })),
    }));
  }
}
