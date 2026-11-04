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
